//adapts endpoints
//<-> alters endpoints' parameters and results
//-> keeps API logic
//-> saves session key
//-> maps results
//-asserts API
utils.module.save('endpoint', (function(){
    var config = utils.module.load('config');

    //generic API HTTP req
    var sid = (function(){ 
        var STORAGE_KEY = 'session_id';
        return {
            get: function()   { return utils.storage.get(STORAGE_KEY);    },
            set: function(val){        utils.storage.set(STORAGE_KEY,val);},
            del: function()   {        utils.storage.del(STORAGE_KEY);    }
        };
    })(); 

    var _call;
    var generateEndpointFct = (function(){ 
        function apiReq(param) { 
            //param.url
            //param.method
            //param.data
            //param.callback
            //param.noSessionKey
            utils.assert(param.data===undefined || param.data.constructor===Object,'param.data should be an object');
            function errHandling (status,statusText) {
                utils.assert(status.constructor===Number);
                var errStr = 'ERR: ' + status + ' ' + param.method + ' ' + param.url + ' [' + JSON.stringify(param.data) + ' -> ' + statusText + ']';
                if(param.onError) param.onError(errStr);
                else if(endpoint._config.safeMode) utils.assert(false,errStr);
                else throw errStr;
            }
            if( !param.data ) {
                param.data = {};
            }
            utils.assert(sid.get() || param.noSessionKey,'trying to do a request with missing session_key');
            if( sid.get() && !param.noSessionKey ) {
                param.data['session_key'] = sid.get();
            }
            if( param.method !== 'GET' ) {
                param.data = JSON.stringify(param.data);
            }
            if( param.method === 'GET' && ! param.noPaging) {
                param.data['page_number'] = param.data['page_number'] || 1;
                param.data['page_size']   = param.data['page_size']   || 999999;
            }
            if( endpoint._config.onBeforeRequest ) endpoint._config.onBeforeRequest();

            utils.req(
                param.method,
                config.ENDPOINT_ROOT+param.url,
                param.data,
                function(resp,req){
                      var isError = req.status!==200;
                      try {
                         resp = JSON.parse(resp);
                      }catch(e){
                          isError = true;
                          resp = undefined;
                      }
                      isError = isError || !resp || resp.constructor!==Object || resp['status']!=='ok';
                      if( isError ) errHandling(req.status,req.statusText);
                      var callback_return_val = !isError&&resp || undefined;
                      if( !isError ) if( param.onSuccess ) param.onSuccess( callback_return_val );
                      if( param.callback ) param.callback( callback_return_val );
                      if( endpoint._config.onAfterRequest ) {
                          var fcts = endpoint._config.onAfterRequest;
                          if( fcts.constructor!==Array ) fcts = [fcts];
                          fcts.forEach(function(fct){fct();});
                      }
                }
            );
        } 
        _call = apiReq;

        function processResult(ret,path,fallback_ret) { 
            if(ret && ret.constructor===Number) {
                //ret is a Number <=> server replies status code !== 200
                //ret === status code
                var errMsg = ret + ' ' + config.ENDPOINT_ROOT + '/' + path;
                utils.assert(false,errMsg);
                if( !endpoint._config.safeMode ) throw errMsg;
                return fallback_ret;
            }
            path = 'result/' + path;
            path.split('/').some(function(dir){
                if(dir==='') return false;
                if(ret===undefined || ret===null){
                    utils.assert(false,'couldn\'t retrieve path '+ path + ' because missing ' + dir + ' object');
                    return true;
                }
                utils.assert(ret.constructor===Object || ret.constructor===Array);
                ret = ret[dir];
            });
            if( !endpoint._config.safeMode ) return ret;
            return ret!==undefined&&ret!==null&&ret || fallback_ret;
        } 

        return function (argsEndpoint) { 
            utils.assert(argsEndpoint&&argsEndpoint.constructor===Object);
            utils.assert(argsEndpoint.endpoint&&argsEndpoint.endpoint.constructor===Object);
            utils.assert(argsEndpoint.endpoint.method&&argsEndpoint.endpoint.path);
            utils.assert(argsEndpoint.endpoint.path.indexOf('%')===-1 || argsEndpoint.input&&argsEndpoint.input.pathInput);
            var ret = function(){ 
                var argsCall  = arguments;

                var inputLength = 0;
                if(argsEndpoint.input && argsEndpoint.input.required) inputLength = argsEndpoint.input.required.length;

                utils.assert(argsCall.length<=inputLength+2);
                utils.assert(argsCall[inputLength  ]===undefined || argsCall[inputLength  ].constructor===Function);
                utils.assert(argsCall[inputLength+1]===undefined || argsCall[inputLength+1].constructor===Function);

                var inputData = {};
                if ( argsEndpoint&&argsEndpoint.input&&argsEndpoint.input.default )
                    for(var i in argsEndpoint.input.default)
                        inputData[i] = argsEndpoint.input.default[i];
                for( var i in inputData)
                    if(inputData[i].constructor===Function)
                        inputData[i] = inputData[i]();

                if( inputLength ) argsEndpoint.input.required.forEach(function(key,i) {
                    var val = argsCall[i];
                    if( val && val.constructor!==Function ) {
                        if( argsEndpoint.endpoint.method==='GET' ) {
                            if( val.constructor===Number ) val = val.toString();
                            utils.assert(val.constructor===String); //GET args are allways expected to be strings
                        }
                        inputData[key] = val;
                    }
                    if( !inputData[key] ) {
                        var errMsg = 'missing argument ' + key +' for call to '+argsEndpoint.endpoint.method + ' ' + argsEndpoint.endpoint.path;
                        utils.assert(false,errMsg);
                        throw errMsg;
                    }
                });
              //argsEndpoint.input&&argsEndpoint.input.required && argsEndpoint.input.required.forEach(function(key){utils.assert(inputData[key],key + ' required')});

                var path = argsEndpoint.endpoint.path;
                if( argsEndpoint.input && argsEndpoint.input.pathInput ) {
                      path = path.replace('%',inputData[argsEndpoint.input.pathInput]);
                      delete inputData[argsEndpoint.input.pathInput];
                }

                apiReq({
                    url: path,
                    method: argsEndpoint.endpoint.method,
                    data: inputData,
                    noSessionKey: argsEndpoint.input&&argsEndpoint.input.noSessionKey,
                    callback: function(resp){
                      var ret = resp;
                      if( argsEndpoint.output ) {
                          if( !argsEndpoint.output.path ) argsEndpoint.output.path = '';
                          utils.assert( ret && ret['result'], 'no results from ' + path );
                          ret = processResult(ret,argsEndpoint.output.path,argsEndpoint.output.default);
                      }
                      if( ret && argsEndpoint.output && argsEndpoint.output.map ) {
                          utils.assert( ret.constructor===Array || ret.constructor===Object );
                          if( ret.constructor===Array  ) ret = ret.map(argsEndpoint.output.map);
                          if( ret.constructor===Object ) ret = argsEndpoint.output.map(ret);
                      }
                      if( ret && argsEndpoint.output && argsEndpoint.output.process ) {
                          ret = argsEndpoint.output.process(ret);
                      }
                      //call argsEndpoint.output.call before callback, because:
                      //-on sign out the session key needs to be deleted before callback
                      if( argsEndpoint.output && argsEndpoint.output.callback ) argsEndpoint.output.callback(ret);
                      if( argsCall[inputLength] ) argsCall[inputLength](ret);
                    },
                    onError: argsCall[inputLength+1],
                    onSuccess: argsCall[inputLength+2]
                });
                if( argsEndpoint.input && argsEndpoint.input.fctToCall ) argsEndpoint.input.fctToCall();
            }; 
            ret.backend = { 
                url: argsEndpoint.endpoint.path,
                method: argsEndpoint.endpoint.method
            }; 
            return ret;
        }; 
    })(); 

    function map_groups(groups,elemType) {
        utils.assert(groups && groups.constructor===Array && groups.length);
        if(typeof groups === 'undefined')
          return [];
        groups = groups.map(function(group){
            group.type    = elemType;
            group.isGroup = true;
            group['id']   = group['group_id'];
            delete          group['group_id'];
            group['name'] = group['group_name'] || 'no name';
            delete          group['group_name'];
            return group;
        });
    } 
    function map_elem(elem,elemType){ 
        elem['id']   = elem[elemType+'_id'];
        delete         elem[elemType+'_id'];
        elem['name'] = elem[elemType+'_name'] || 'no name';
        delete         elem[elemType+'_name'];
        elem.type    = elemType;
        if(elem[elemType+'_group_id']) {
            elem['group_id'] = elem[elemType+'_group_id'];
            delete             elem[elemType+'_group_id'];
        }
        return elem;
    }

    function generateElemGetter(elemType){ 
        var sensor_type;
        if( elemType==='sensor' ) sensor_type = {'sensor_type':'ignored'};
        return generateEndpointFct({
            endpoint : { method: 'GET', path: '/' + elemType + 's/' },
            input    : { default:sensor_type },
            output   : { 
                path    : elemType + 's',
                default : [],
                map     : function(elem) {
                    return map_elem(elem,elemType);
                } 
            } 
        });
    } 

    var endpoint = { 
        manufacturing:{ 
            tag    : generateEndpointFct({
                endpoint : { method: 'POST', path: '/private/manufacturing/tag'    },
                input    : { required:['hardware_id'], default:{'hardware_type':'ignored'} }
            }),
            sensor : generateEndpointFct({
                endpoint : { method: 'POST', path: '/private/manufacturing/sensor' },
                input    : { required:['hardware_id'], default:{'hardware_type':'door'   } }
            })
        }, 
        session:{ 
            signin     : generateEndpointFct({
                endpoint : { method: 'POST'  , path: '/session/'           },
                input    : { required:['username','password'], noSessionKey:true },
                output   : { path: 'session/session_key', callback: function(sid_){if(sid_) sid.set(sid_); else sid.del();} }
            }),
            signout    : generateEndpointFct({
                //utils.assert(sid.get(),'signout while being already signed out');
                endpoint : { method: 'DELETE', path: '/session/%' },
                input    : {
                    pathInput :  'hahaImNotNeeded;)' ,
                    default   : {'hahaImNotNeeded;)': function(){return sid.get();}},
                    fctToCall : function(){sid.del();}
                }
            }),
            signoutAll : generateEndpointFct({
                endpoint : { method: 'DELETE', path: '/session/' },
                input    : { fctToCall : function(){sid.del();} }
            })
        }, 
        users: (function(){ 
            function mapUserResult(user){ 
                user['id']   = user['user_id'];
                delete         user['user_id'];
                user['name'] = user['username'];
                delete         user['username'];
                var elemType = 'user';
                user.type    = elemType;
                map_groups(user['groups'],elemType);
                return user;
            } 
            return {
                getMyself: generateEndpointFct({ 
                    endpoint : {method: 'GET', path: '/users/' },
                    output   : {
                        path : 'users/0',
                        map  : mapUserResult
                    }
                }), 
                getOther: generateEndpointFct({ 
                    endpoint : {method: 'GET', path: '/users/%' },
                    input    : {required:['hahaImNotNeeded;)'],pathInput: 'hahaImNotNeeded;)'},
                    output   : {
                        path : 'user',
                        map  : mapUserResult
                    }
                }), 
                getAll: generateEndpointFct({ 
                    endpoint : { method: 'GET', path: '/users/' },
                    output   : {
                        path : 'users',
                        map  : mapUserResult
                    }
                }), 
                register: generateEndpointFct({ 
                    endpoint : { method: 'POST', path: '/users/' },
                    input    : { required:['username','password'], noSessionKey:true }
                }) 
            };
        })(), 
        tags:{ 
            get: generateElemGetter('tag'),
            claim: generateEndpointFct({ 
                    endpoint : { method: 'POST', path: '/tags/claim' },
                    input    : { required:['tag_key','user_group_id','tag_id'] }
            }) 
        }, 
        permissions: (function(){ 
            function setter(method) { 
                return generateEndpointFct({
                    endpoint: {method: method, path: '/permissions/tag/sensor/'},
                    input: {required:['tag_group','sensor_group']}
                });
            } 
            function getter(srcName,targetName) { 
                return generateEndpointFct({
                    endpoint : {method: 'GET' , path: '/permissions/'+srcName+'/%/'+targetName+'s/'},
                    input    : {required:['notNeededNeither'],pathInput: 'notNeededNeither'},
                    output   : {
                        path    : targetName+'s',
                        default : [],
                        map     : function(item){
                            return map_elem(item,targetName);
                        },
                        process : function(res){
                            var res2 = res.map(function(elem){
                                return elem['group_id'];
                            });
                            res2 = res2.filter(function(elem,i){
                                return res2.indexOf(elem) === i;
                            });
                            return {
                                singles : res,
                                groups  : res2
                            };
                        }
                    }
                });
            } 
            return {
                post    : setter('POST'  ),
                remove  : setter('DELETE'),
                tags    : getter('sensor','tag'),
                sensors : getter('tag','sensor')
            };
        })(), 
        sensors:{ 
            get: generateElemGetter('sensor'),
            open: generateEndpointFct({
                endpoint : {method: 'POST', path: '/sensors/%/act/open'},
                input    : {required:['hahaImNotNeeded;)'],pathInput: 'hahaImNotNeeded;)'}
            })
        },
        access: {
            get: generateElemGetter('permissions/access')
        },
        groups:(function(){ 
            var ret = {};
            ['tag','sensor','user'].forEach(function(elemType){
                ret[elemType] = {
                    get             : generateEndpointFct({ 
                        endpoint: {method: 'GET', path: '/groups/'+elemType+'/'},
                        output: {
                            path: elemType+'_groups',
                            default: [],
                            map: function(g){
                                utils.assert(g['group_id'  ],  'group id expected');
                                g['id'  ] = g['group_id'  ];
                                g['name'] = g['group_name'] || 'no name';
                                g.type    = elemType;
                                g.isGroup = true;
                                delete g['group_id'  ];
                                delete g['group_name'];
                                return g;
                            }
                        }
                    }), 
                    create          : generateEndpointFct({ 
                        endpoint: {method: 'POST', path: '/groups/'+elemType+'/'},
                        input   : {required: ['group_name','user_group_id']},
                        output  : {
                            map: function(elem){
                                elem['id'] = elem[elemType+'_group'];
                                delete elem[elemType+'_group'];
                                elem['name'] = elem['group_name'] || 'no name';
                                delete elem['group_name'];
                                return elem;
                            }
                        }
                    }), 
                    remove          : generateEndpointFct({ 
                        endpoint: {method: 'DELETE', path: '/groups/'+elemType+'/'},
                        input   : {required: ['group_id']}
                    }), 
                    removeFromGroup : generateEndpointFct({ 
                        endpoint: {method: 'DELETE', path: '/groups/'+elemType+'/%'},
                        input   : {required: ['imLocalYo',elemType+'_id'],pathInput: 'imLocalYo'}
                    }), 
                    addToGroup      : generateEndpointFct({ 
                        endpoint: {method: 'POST'  , path: '/groups/'+elemType+'/%'},
                        input   : {required: ['imLocalYo',elemType+'_id'],pathInput: 'imLocalYo'}
                    }) 
                };
            });
            return ret;
        })(), 
        friendly_names:(function(){ 
            var ret = {};
            ['tag','sensor','user','gateway'].forEach(function(elemType){
                ret[elemType] = {
                    set: generateEndpointFct({ 
                        endpoint: { method: 'POST', path: '/fnames/'+elemType+'/%' },
                        input   : { required: ['imLocalYo','friendly_name'],pathInput: 'imLocalYo' }
                    }), 
                    get: generateEndpointFct({ 
                        endpoint: { method: 'GET', path: '/fnames/'+elemType+'/%' },
                        input   : { required: ['imLocalYo'],pathInput: 'imLocalYo' },
                        output  : { path: 'user/fname' }
                    })
                };
            });
            return ret;
        })() 
    }; 

    endpoint._call   = _call;
    endpoint._config = { 
        safeMode: true,
        isSigned:function(){
            return !!sid.get();
        }
    }; 

    return endpoint;
})());
