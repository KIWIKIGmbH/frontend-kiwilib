//adapts API
//glues API logic with front-end logic
utils.module.save('api', (function(){
    var endpoint = utils.module.load('endpoint');

    var generator = (function(){
        var get_current_user_information = (function(){ 
            //known caveat that may turn into bug; after signing out `var current_user` is still going to hold signout user information
            var current_user;
            return function(callback){
                if( current_user ) {
                    callback(current_user);
                }
                else {
                    endpoint.users.getMyself(function(user){
                        current_user = user;
                        callback(current_user);
                    });
                }
            };
        })(); 
        return {
            load_nodes: function(endpoint_leaf,endpoint_node){ 
                return function(callback){
                    function checkRet(ret){
                        if( !ret || ret.constructor!==Array ) {
                            utils.assert(false);
                            return false;
                        }
                        return true;
                    }
                    endpoint_node(function(groupsArr){
                        if( !checkRet(groupsArr) ) groupsArr=[];
                        var groups = {};
                        groupsArr.forEach(function(g){utils.assert(g['id']&&g.type);groups[g['id']]=g;});
                        endpoint_leaf(function(singles){
                            if( !checkRet(singles) ) singles=[];
                            var ret = [];
                            singles.forEach(function(s){
                                utils.assert(s['groups'],'missing groups');
                                utils.assert(!s.isGroup,'a tag/sensor/user mistakenly set a group');
                                if(typeof s['groups'] !== "undefined") {
                                  s['groups'].forEach(function(group){
                                    utils.assert(group.type&&group['id']);
                                    s = JSON.parse(JSON.stringify(s)); //angular doesn't want to scope several times over a single object
                                    if( groups[group.id] ) {
                                      if( !groups[group.id].childs ) groups[group.id].childs = [];
                                      groups[group.id].childs.push(s);
                                    }
                                    else {
                                      utils.assert(false,'group contradictory both with and without permission');
                                      ret.push(s);
                                    }
                                  });
                                };
                            });
                            for(var i in groups) ret.push(groups[i]);
                            callback(ret);
                        });
                    });
                };
            }, 
            alter_group_add: function(endpoint_add){ 
                //add to argument list a group id the current user belongs to
                return function (group_name,callback){
                    get_current_user_information(function(user){
                        endpoint_add(group_name,user.groups[0].id,callback);
                    });
                };
            }, 
            friendly_names: function(elem_type,endpoint_name){ 
                //prepend user_id to argument list
                return function(){
                    var args = [].slice.call(arguments);
                    endpoint.friendly_names[elem_type][endpoint_name].apply(null, args);
                };
            } 
        };
    })();

    var api = {
        config : {},
        user : (function(){ 
            var userName = (function(){ 
                var STORAGE_KEY = 'user_name';
                return {
                    get: function()   { return utils.storage.get(STORAGE_KEY);    },
                    set: function(val){        utils.storage.set(STORAGE_KEY,val);},
                    del: function()   {        utils.storage.del(STORAGE_KEY);    }
                };
            })(); 
            return {
                getName    : function(){ return userName.get(); },
                isSigned   : function(){ return endpoint._config.isSigned(); },
                signout    : function(){ endpoint.session.signout   ();userName.del(); },
                signoutAll : function(){ endpoint.session.signoutAll();userName.del(); },
                signin     : function(uname,pw,callback, onSuccess, onError){ 
                    endpoint.session.signin(uname,pw,function(){
                        userName.set(uname);
                        if( callback ) callback();
                    }, onSuccess, onError);
                }, 
                signup     : function(uname,pw,callback, onSuccess, onError){ 
                    var that = this;
                    endpoint.users.register(uname,pw,function(){
                        that.signin(uname,pw,callback);
                    }, onSuccess, onError);
                } 
            };
        })(), 
        load: { 
            singles: {
                tag    : endpoint.tags.get,
                sensor : endpoint.sensors.get,
                access : endpoint.access.get
            },
            groups: {
                sensor : generator.load_nodes(endpoint.sensors.get   ,endpoint.groups.sensor.get),
                tag    : generator.load_nodes(endpoint.tags   .get   ,endpoint.groups.tag   .get),
                user   : generator.load_nodes(endpoint.users  .getAll,endpoint.groups.user  .get)
            },
            permissions: function(elem,cb){ 
              if( !elem.isGroup ) {
                  var type_opposite = elem.type==='sensor'?'tag':'sensor';
                  endpoint.permissions[type_opposite+'s'](elem.id,cb);
              }
              else throw 'GET permission from groups not implemented yet';
            }, 
            friendly_names : (function(){ 
                var ret = {};
                ['user','sensor','tag','gateway'].forEach(function(elem_type){
                    ret[elem_type] = generator.friendly_names(elem_type,'get');
                });
                return ret;
            })() 
        }, 
        alter: { 
            group: {
                add: {
                    sensor : generator.alter_group_add(endpoint.groups.sensor.create),
                    tag    : generator.alter_group_add(endpoint.groups.tag   .create),
                    user   : generator.alter_group_add(endpoint.groups.user  .create)
                },
                remove: {
                    sensor : endpoint.groups.sensor.remove,
                    tag    : endpoint.groups.tag   .remove,
                    user   : endpoint.groups.user  .remove
                }
            },
            permission: {
                add    : endpoint.permissions.post,
                remove : endpoint.permissions.remove
            },
            system: {
                add_sensor : endpoint.manufacturing.sensor,
                add_tag    : endpoint.manufacturing.tag,
                claim_tag  : endpoint.tags.claim
            },
            open : endpoint.sensors.open,
            friendly_names : (function(){ 
                var ret = {};
                ['user','sensor','tag','gateway'].forEach(function(elem_type){
                    ret[elem_type] = generator.friendly_names(elem_type,'set');
                });
                return ret;
            })() 
        } 
    };

    endpoint._config.onBeforeRequest=function(){ api.config.onBeforeRequest && api.config.onBeforeRequest(); };
    endpoint._config.onAfterRequest =function(){ api.config.onAfterRequest  && api.config.onAfterRequest (); };

    return api;
})());

