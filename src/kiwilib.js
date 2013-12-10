window.kiwilib = (function(){

    var api    = utils.module.load('api');
    var config = utils.module.load('config');

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
            singles    : [],
            nodes      : [],
            addGroup   : function(name){
             api.alter.group.add.sensor(name,function(){load.all()});
           }
        }, 
        tags      : { 
            singles    : [],
            nodes      : [],
            addGroup   : function(name){
             api.alter.group.add.tag  (name,function(){load.all()});
           }
        }, 
        users     : { 
            nodes      : [],
            addGroup   : function(name){
             api.alter.group.add.user (name,function(){load.all()});
           }
        }, 
        selection : { 
            selected: null
            //
        }, 
        system    : { 
            addSensor : api.alter.system.add_sensor,
            addTag    : api.alter.system.add_tag
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
    var scaffold_element = { 
        toggleSelect : function(){ 
            var elem = this;
            utils.assert(elem && elem.id && elem.type);

            if(elem.type==='user' || elem.isGroup) return;//TODO

            if(scaffold.selection.selected && scaffold.selection.selected!==elem) scaffold.selection.selected.isSelected=false;
            elem.isSelected = !elem.isSelected;
            scaffold.selection.selected = elem.isSelected?elem:undefined;
            load.permission.fromSelected();
        }, 
        permission : {
            toSelected: null,
            change: function(target,newPerm){ 
                var elem = this._parent;
                utils.assert(elem && elem.id && elem.type);
                if(elem.type==='user') return;

                utils.assert(newPerm===false||newPerm===true,'wrong JS type for newPerm==='+newPerm);

                var source = elem;
                if( !source.isGroup ) source = source.groups[0];
                utils.assert(source);
                if( !target ) target = scaffold.selection.selected;
                utils.assert(target);
                if( !target.isGroup ) target = target.groups[0];
                utils.assert(target);

                utils.assert(target.type!==source.type || target.type==='user');
                var tag_group_id = source.type==='tag'   ?source['id']:target['id'];
                var sen_group_id = source.type==='sensor'?source['id']:target['id'];
                api.alter.permission[newPerm?'add':'remove'](tag_group_id,sen_group_id,function(){
                    load.permission.fromSelected();
                });
            } 
        }
    }; 
    var scaffold_element_group  = { 
        remove : function(){
            var elem = this;
            utils.assert(elem && elem.id && elem.type);
            api.alter.group.remove[elem.type](elem.id,function(){load.all();});
        }
    }; 
    var scaffold_element_sensor = { 
        open : function(){ 
            var elem = this;
            utils.assert(elem && elem.id && elem.type);
            api.alter.open(elem.id,function(){
                elem.isOpen = true;
                setTimeout(function(){
                    elem.isOpen = false;
                    dataChangeListeners.fire();
                },config.DOOR_OPEN_DURATION);
            });
        }, 
        permission : {
            tag : { 
                groups  : [],
                singles : []
            } 
        }
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
                utils.assert(scaffold.sensors.singles.length);
                scaffold.sensors.singles.forEach(function(sensor){
                    api.load.permissions.sensor(sensor.id,function(group_ids){
                        sensor.permission.tag.groups  = group_ids;
                        sensor.permission.tag.singles = scaffold['tags'].singles.filter(function(tag){
                            utils.assert(tag.groups,'missing groups');
                            return tag.groups.some(function(group){ return group_ids.indexOf(group.id)!==-1});
                        }).map(function(tag){return tag.id});
                    });
                });
            }, 
            fromSelected: function(){ 
                TYPES
                .map(function(type){return scaffold[type+'s'].nodes})
                .reduce(function(l,r){return l.concat(r)})
                .forEach(function(node){
                    delete node.permission.toSelected;
                });
                dataChangeListeners.fire();

                var selected = scaffold.selection.selected;
                if(selected) {
                    utils.assert( !selected.isGroup );
                    api.load.permissions[selected.type](selected['id'],function(group_ids){
                        utils.assert( group_ids && group_ids.constructor === Array);
                        scaffold[selected.type==='sensor'?'tags':'sensors'].nodes.forEach(function(node){
                            if( !node.isGroup ) return;
                            node.permission.toSelected = group_ids.indexOf(node['id'])!==-1?1:0;
                        });
                    });
                }
            } 
        },
        elems: function(type){ 
            var elemObj = scaffold[type+'s'];
            if(elemObj.singles) elemObj.singles.length = 0;
            elemObj.nodes.length = 0;

            if( !api.user.isSigned() ) return;

            function mount(elems){ 
                function mountScaffold(elem,scaffold) { 
                    function mountObj(elem_,prop,obj) {
                        utils.assert(obj===null || obj.constructor===Function || obj.constructor===Object || obj.constructor===Array&&obj.length===0);
                        if( obj===null                        ) elem_[prop] = null;
                        else if( obj.constructor === Function ) elem_[prop] = obj;
                        else if( obj.constructor === Object   ) elem_[prop] = elem_[prop] || {};
                        else if( obj.constructor === Array    ) elem_[prop] = [];
                    }
                    for(var i in scaffold) {
                        mountObj(elem,i,scaffold[i]);
                        if(elem[i].constructor === Object) {
                            elem[i]._parent = elem;
                            for(var j in scaffold[i]) mountObj(elem[i],j,scaffold[i][j]);
                        }
                    }
                } 
                elems.forEach(function(elem){
                    utils.assert(TYPES.indexOf(elem.type)!==-1);
                    utils.assert(elem.isGroup===true || elem.isGroup===undefined);
                    utils.assert(type===elem.type,type + elem.type);

                    /*noLint*/                                  mountScaffold(elem,scaffold_element);
                    if( !elem.isGroup && elem.type==='sensor' ) mountScaffold(elem,scaffold_element_sensor);
                    if(  elem.isGroup                         ) mountScaffold(elem,scaffold_element_group);
                    if(  elem.childs                          ) mount(elem.childs);
                });
            } 

            if(elemObj.singles) api.load.singles[type](function(res){ 
                elemObj.singles.length = 0;
                res.forEach(function(elem){ elemObj.singles.push(elem); });
                mount(elemObj.singles);
                if(type==='sensor') load.permission.table();
            }); 

            api.load.groups[type](function(res){ 
                elemObj.nodes.length = 0;
                res.forEach(function(elem){ elemObj.nodes.push(elem); });
                mount(elemObj.nodes);
            }); 
        }, 
        all: function(){ 
            load.elems('sensor');
            load.elems('tag'   );
            load.elems('user'  );
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
