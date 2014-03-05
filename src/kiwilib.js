window.kiwilib = (function(){

    var api    = utils.module.load('api');
    var config = utils.module.load('config');

    var sensor_order;

    var scaffold = { 
        user      : { 
            session: { 
                username: null,
                isSigned: null
            }, 
            signin: { 
                name: null,
                pass: null,
                req: function(argsObj){
                    argsObj = argsObj || {};
                    var elem = this;
                    utils.exception(this.name && this.pass,'no username/password provided');
                    api.user.signin(this.name,this.pass,function(){
                        load.all();
                        if( argsObj.callback ) argsObj.callback.apply(elem,arguments);
                    }, argsObj.onError, argsObj.onSuccess);
                }
            }, 
            signup: { 
                name: null,
                pass: null,
                req: function(argsObj){
                    argsObj = argsObj || {};
                    var elem = this;
                    utils.exception(this.name && this.pass,'no username/password provided');
                    api.user.signup(this.name,this.pass,function(){
                        load.all();
                        if( argsObj.callback ) argsObj.callback.apply(elem,arguments);
                    }, argsObj.onError, argsObj.onSuccess);
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
                api.alter.group.add.sensor(name,function(){load.all();});
            },
            setOrder   : function(orderObj){
                utils.assert(orderObj['coordinates']);
                sensor_order = orderObj;
                load.elems('sensor');
            }
        }, 
        tags      : { 
            singles    : [],
            nodes      : [],
            addGroup   : function(name){
                api.alter.group.add.tag  (name,function(){load.all();});
            },
            claim      : function(id, key, argsObj) {
                argsObj = argsObj || {};
                var elem = this;
                api.alter.system.claim_tag(key, 1, id,function(){
                    if( argsObj.callback ) argsObj.callback.apply(elem,arguments);
                },argsObj.onError,argsObj.onSuccess);
            }
        },
        access    : {
            singles    : []
        },
        users     : { 
            nodes      : [],
            addGroup   : function(name){
                api.alter.group.add.user (name,function(){load.all();});
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
        addDataChangeListener: function(l){dataChangeListeners.add(l);}
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
    var scaffold_element_single = { 
        rename: function(new_val, argsObj){ 
            argsObj = argsObj || {};
            var elem = this;
            utils.assert(elem && elem.id && elem.type);

            api.alter.friendly_names[elem.type](elem.id,new_val,function(){
                if( argsObj.callback ) argsObj.callback.apply(elem,arguments);
            },argsObj.onError,argsObj.onSuccess);
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
        open : function(argsObj){ 
            argsObj = argsObj || {};
            var elem = this;
            utils.assert(elem && elem.id && elem.type);
            api.alter.open(elem.id,function(){
                //since function is set as callback.
                //But it should be set as onSuccess attribute.
                //In essence we are lying about the Success of opening doors
                //We lie because for now there are no ways to check if the door is actually open or not
                elem.isOpen = true;
                setTimeout(function(){
                    elem.isOpen = false;
                    dataChangeListeners.fire();
                },config.DOOR_OPEN_DURATION);
                if( argsObj.callback ) argsObj.callback.apply(null,arguments);
            },argsObj.onError,argsObj.onSuccess);
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
        elems: function(type, typePostfix){ 
            var elemObj = scaffold[type+typePostfix];
            if(elemObj.singles) elemObj.singles.length = 0;
            if (elemObj.nodes) {
                elemObj.nodes.length = 0;
            }

            utils.assert( api.user.isSigned() );

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
                    utils.assert(TYPES.indexOf(elem.type)!==-1, "element undefined");
                    utils.assert(elem.isGroup===true || elem.isGroup===undefined);
                    utils.assert(type===elem.type,"expected: " + type + ", got: " + elem.type);

                    /*noLint*/                                  mountScaffold(elem,scaffold_element);
                    if( !elem.isGroup && elem.type==='sensor' ) mountScaffold(elem,scaffold_element_sensor);
                    if(  elem.isGroup                         ) mountScaffold(elem,scaffold_element_group);
                    if( !elem.isGroup                         ) mountScaffold(elem,scaffold_element_single);
                    if(  elem.childs                          ) mount(elem.childs);
                });
            } 

            if(elemObj.singles) api.load.singles[type](function(res){ 
                elemObj.singles.length = 0;
                res.forEach(function(elem){ elemObj.singles.push(elem); });
                if( type==='sensor' && sensor_order ) elemObj.singles.sort(function(l,r) { 
                    var no_missing_data =
                        sensor_order['coordinates'] &&
                        sensor_order['coordinates']['latitude'] &&
                        sensor_order['coordinates']['longitude'] &&
                        l['geo']['lat'] &&
                        l['geo']['lng'] &&
                        r['geo']['lat'] &&
                        r['geo']['lng'];
                    utils.assert(no_missing_data,'geolocation data missing');
                    if( !no_missing_data ) return 0;
                    function get_distance(sensor) {
                        return Math.sqrt(
                            Math.pow(sensor['geo']['lat'] - sensor_order['coordinates']['latitude'] ,2) +
                            Math.pow(sensor['geo']['lng'] - sensor_order['coordinates']['longitude'],2)
                        );
                    }
                    var ld = get_distance(l);
                    var rd = get_distance(r);
                    if( ld === rd ) return 0;
                    return ld > rd ? -1 : 1;
                });
                mount(elemObj.singles);
            }); 

            if (type in api.load.groups) {
                api.load.groups[type](function(res){ 
                    elemObj.nodes.length = 0;
                    res.forEach(function(elem){ elemObj.nodes.push(elem); });
                    mount(elemObj.nodes);
                });
            }
        }, 
        all: function(){ 
            if( !api.user.isSigned() ) {
                dataChangeListeners.fire();
                return;
            }

            load.elems('sensor', 's');
            load.elems('tag',    's');
            load.elems('user',   's');
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
