window.kiwilib = (function(){

    var api = utils.module.load('api');

    var scaffold = {
        user      : { 
            session: { 
                username: null,
                isSigned: null
            }, 
            signin: { 
                name: null,
                pass: null,
                req: function(){
                    utils.exception(this.name && this.pass,'no username/password provided');
                    api.user.signin(this.name,this.pass,function(){
                        load.all();
                    });
                }
            }, 
            signup: { 
                name: null,
                pass: null,
                req: function(){
                    utils.exception(this.name && this.pass,'no username/password provided');
                    api.user.signup(this.name,this.pass,function(){
                        load.all();
                    });
                }
            }, 
            signout : function(){ 
                api.user.signout();
                load.all();
            }, 
            signoutAll : function(){ 
                api.user.signoutAll();
                load.all();
            } 
        }, 
        sensors   : { 
            singles: [],
            nodes  : [],
            addGroup: function(name){
             api.sensors.groups.add(name,function(){load.all()});
           }
        }, 
        tags      : { 
            singles: [],
            nodes  : [],
            addGroup: function(name){
             api.tags   .groups.add(name,function(){load.all()});
           }
        }, 
        users     : { 
            nodes  : [],
            addGroup: function(name){
             api.users  .groups.add(name,function(){load.all()});
           }
        }, 
        selection : { 
            selected: null
            //
        }, 
        system    : { 
            addTag    : api.tags.addToSystem,
            addSensor : api.sensors.addToSystem
        }, 
        misc      : { 
            loading: null
            //
        }, 
        init      : function(){ 
            load.all();
            //
        }, 
        addDataChangeListener: function(l){dataChangeListeners.add(l)}
    };

    var TYPES = ['user','sensor','tag'];

    var dataChangeListeners = (function(){ 
        var listeners = [];
        return {
            fire: function(){
                listeners.forEach(function(l){ l(); });
            },
            add: function(l){
                listeners.push( l );
            }
        };
    })(); 

    var load = { 
        permission: {
            table: function(){ 
                utils.assert(scaffold['sensors'].singles.length);
                scaffold['sensors'].singles.forEach(function(sensor){
                    api.sensors.permission.get(sensor.id,function(group_ids){
                        sensor.permissions             = {};
                        sensor.permissions.tag         = {};
                        sensor.permissions.tag.groups  = group_ids;
                        sensor.permissions.tag.singles = scaffold['tags'].singles.filter(function(tag){return group_ids.indexOf(tag.group_id)!==-1});
                    });
                });
            }, 
            fromSelected: function(){ 
                TYPES
                .map(function(type){return scaffold[type+'s'].nodes})
                .reduce(function(l,r){return l.concat(r)})
                .forEach(function(node){
                    delete node.permCurrent;
                });
                dataChangeListeners.fire();

                var selected = scaffold.selection.selected;
                if(selected) {
                    utils.assert( !selected.isGroup );
                    api[selected.type+'s'].permission.get(selected['id'],function(group_ids){
                        utils.assert( group_ids && group_ids.constructor === Array);
                        scaffold[selected.type==='sensor'?'tags':'sensors'].nodes.forEach(function(node){
                            if( !node.isGroup ) return;
                            node.permCurrent = group_ids.indexOf(node['id'])!==-1?1:0;
                        });
                        dataChangeListeners.fire();
                    });
                }
            } 
        },
        elems: function(type){ 
            var elemObj = scaffold[type+'s'];
            if(elemObj.singles) elemObj.singles.length = 0;
            elemObj.nodes.length = 0;

            if( !api.user.isSigned() ) return;
            console.log(1);

            if(elemObj.singles) api[type+'s'].get(function(res){ 
                elemObj.singles.length = 0;
                res.forEach(function(elem){
                    if( type==='sensor' ) elem.open = function(){ 
                        api.sensors.open(elem.id,function(){
                            elem.isOpen = true;
                            dataChangeListeners.fire();
                            setTimeout(function(){
                                elem.isOpen = false;
                                dataChangeListeners.fire();
                            },3000);
                        });
                    }; 
                    elemObj.singles.push(elem);
                });
                dataChangeListeners.fire();
            }); 

            api[type+'s'].groups.get(function(res){ 
                elemObj.nodes.length = 0;
                res.forEach(function(elem){ elemObj.nodes.push(elem); });
                (function addFcts(arr){ 
                    arr.forEach(function(elem){
                      //elem.permList = {};
                        utils.assert(TYPES.indexOf(elem.type)!==-1);
                        utils.assert(elem.isGroup===true || elem.isGroup===undefined);
                        utils.assert(type===elem.type,type + elem.type);
                        if(elem.isGroup) {
                            elem.remove = function(){ 
                                api[type+'s'].groups.remove(elem.id,function(){load.all();});
                            }; 
                        }
                        if(type!=='user' && !elem.isGroup) {
                            elem.toggleSelect = function(){ 
                                if(scaffold.selection.selected && scaffold.selection.selected!==elem) scaffold.selection.selected.isSelected=false;
                                elem.isSelected = !elem.isSelected;
                                scaffold.selection.selected = elem.isSelected?elem:undefined;
                                load.permission.fromSelected();
                            }; 
                        }
                        if(type!=='user' && elem.isGroup) {
                            elem.togglePerm = function(){ 
                                var selected = scaffold.selection.selected;
                                utils.assert(selected); if( !selected ) return;
                                var tag_group_id = elem.type==='tag'   ?elem['id']:selected['id'];
                                var sen_group_id = elem.type==='sensor'?elem['id']:selected['id'];
                                api.tags.permission[elem.permCurrent?'remove':'add'](tag_group_id,sen_group_id,function(){
                                    load.permission.fromSelected();
                                });
                            }; 
                        }
                        if(elem.childs) addFcts(elem.childs);
                    });
                })(elemObj.nodes); 

                dataChangeListeners.fire();
            }); 
        }, 
        all: function(){ 
            this.elems('sensor');
            this.elems('tag'   );
            this.elems('user'  );
        } 
    }; 

  //function getSuperId(elem) { return elem.type + (elem.isGroup?'Group':'') + elem['id']; }

    dataChangeListeners.add(function(){
        scaffold.user.session.isSigned = api.user.isSigned();
        scaffold.user.session.username = api.user.getName();
    });

    api.config.onBeforeRequest = function(){ scaffold.misc.loading=true ; dataChangeListeners.fire(); };
    api.config.onAfterRequest  = function(){ scaffold.misc.loading=false; dataChangeListeners.fire(); };

    return scaffold;
})();
