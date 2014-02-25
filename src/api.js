//glues API logic with front-end logic
utils.module.save('api', (function(){
    var endpoint = utils.module.load('endpoint');

    var api={};
    (function(){
        api.config={};
        endpoint._config.onBeforeRequest=function(){ api.config.onBeforeRequest && api.config.onBeforeRequest() };
        endpoint._config.onAfterRequest =function(){ api.config.onAfterRequest  && api.config.onAfterRequest () };
    })();

    (function(){
        var userName = (function(){ 
            var STORAGE_KEY = 'user_name';
            return {
                get: function()   { return utils.storage.get(STORAGE_KEY)    },
                set: function(val){        utils.storage.set(STORAGE_KEY,val)},
                del: function()   {        utils.storage.del(STORAGE_KEY)    }
            };
        })(); 

        api.user = { 
            getName    : function(){ return userName.get(); },
            isSigned   : function(){ return endpoint._config.isSigned(); },
            signout    : function(){ endpoint.session.signout   ();userName.del(); },
            signoutAll : function(){ endpoint.session.signoutAll();userName.del(); },
            signin     : function(uname,pw,callback){ 
                endpoint.session.signin(uname,pw,function(){
                    userName.set(uname);
                    if( callback ) callback();
                });
            }, 
            signup     : function(uname,pw,callback){ 
                var that = this;
                endpoint.users.register(uname,pw,function(){
                    that.signin(uname,pw,callback);
                });
            } 
        }; 
    })();

    (function(){
        function generateRetrieveAndGroupingFct(endpoint_leaf,endpoint_node){ 
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
                        });
                        for(var i in groups) ret.push(groups[i]);
                        callback(ret);
                    });
                });
            }
        } 

        var userGroupId;
        function generateAddFct(endpoint_add){ 
            return function (arg,callback){
                function do_(){ endpoint_add(arg,userGroupId,callback) }
                if(!userGroupId) endpoint.users.getMyself(function(ret){
                    userGroupId = ret.groups[0].id;
                    do_();
                });
                else do_();
            }
        } 

        api.sensors = { 
            get    : endpoint.sensors.get,
            groups : {
                get   : generateRetrieveAndGroupingFct(endpoint.sensors.get,endpoint.groups.sensor.get),
                add   : generateAddFct(endpoint.groups.sensor.create),
                remove: endpoint.groups.sensor.remove
            },
            open       : endpoint.sensors.open,
            addToSystem: endpoint.manufacturing.sensor,
            permission : {
                get: endpoint.permissions.tags
            }
        }; 

        api.tags    = { 
            get    : endpoint.tags.get,
            groups : {
                get   : generateRetrieveAndGroupingFct(endpoint.tags.get,endpoint.groups.tag.get),
                add   : generateAddFct(endpoint.groups.tag.create),
                remove: endpoint.groups.tag.remove
            },
            addToSystem: endpoint.manufacturing.tag,
            permission: {
                get   : endpoint.permissions.sensors,
                add   : endpoint.permissions.post,
                remove: endpoint.permissions.remove
            }
        }; 

        api.users  = { 
            groups: {
                get   : generateRetrieveAndGroupingFct(endpoint.users.getAll,endpoint.groups.user.get),
                add   : generateAddFct(endpoint.groups.user.create),
                remove: endpoint.groups.user.remove
            }
        }; 
    })();

    return api;
})());
