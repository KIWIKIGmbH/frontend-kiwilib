var endpoint = utils.module.load('endpoint');
endpoint._config.safeMode = true;

var log = (function(DOM){ 
    if(!DOM || !DOM.getElementById) return;

    utils.assert.addListener(function(msg){
        var assEl = DOM.getElementById('ass');
        if( !assEl.children.length ) assEl.innerHTML = '';
        assEl.innerHTML += msg + '<br/><br/>';
    });

    endpoint._config.onBeforeRequest=function(){
        DOM.body.classList.add('loading');
    };
    endpoint._config.onAfterRequest=[function(){
        DOM.body.classList.remove('loading');
    }];

    return {
        savedData : function(savedData){ 
            DOM.getElementById('savedData').innerHTML = JSON.stringify(savedData,null,2);
        }, 
        req : function(url,resp){ 
            var logEl = DOM.getElementById('log');
            if(!logEl) return;
            if( !logEl.children.length ) logEl.innerHTML = '';
            logEl.innerHTML = url + ' => <span class="resp">' + JSON.stringify(resp) + '</span>' + '<br/>' + logEl.innerHTML;
        }, 
        err : function(errMsg){ 
            var errEl = DOM.getElementById('err');
            utils.assert(arguments.length===1);
            if( !errEl.children.length ) errEl.innerHTML = '';
            errEl.innerHTML += errMsg + '<br/><br/>';
        }, 
        missing : function(path){ 
            var misEl = DOM.getElementById('mis');
            if( !misEl.children.length ) misEl.innerHTML = '';
            misEl.innerHTML += 'not covered; ' + path + '<br/>';
        }, 
        endpoints : function(html){ 
            document.getElementById('endpoints').innerHTML = html;
        } 
    };
})(window.document); 

//JS stuff for custom calls through interface
(function(DOM){ 
    if(!DOM || !DOM.getElementById) return;
    function makeInputPersistent(domInput) {
        utils.assert(domInput.id,'input requires an id that is going to be used as localStorage key')
        var KEY = 'input_'+domInput.id;
        domInput.onchange=domInput.oninput=function(){
          var newVal = domInput.type==='checkbox' ? domInput.checked : domInput.value;
          if( !newVal ) delete localStorage[KEY];
          else localStorage[KEY] = domInput.value;
        };
        if( localStorage[KEY] ) domInput.checked = domInput.value = localStorage[KEY];
    }

    DOM.getElementById('prefix').innerHTML = utils.module.load('config').ENDPOINT_ROOT;
    var url    = DOM.getElementById('url');
    var method = DOM.getElementById('method');
    var data   = DOM.getElementById('data');
    var paging = DOM.getElementById('paging');
    makeInputPersistent(url);
    makeInputPersistent(method);
    makeInputPersistent(data);
    makeInputPersistent(paging);

    DOM.getElementById('send').onclick = function(){
        var dataObj = {};
        data.value.split('&').forEach(function(arg){
            if(arg==="") return;
            var d = arg.split('=');
            utils.assert(d.length===2,'argument string expect in GET format, e.g. "firstArg=firstVal&secArg=secVal"');
            dataObj[d[0]] = d[1];
        });
        endpoint._call({
            url: url.value,
            method: method.value,
            data: dataObj,
            noPaging: paging.checked,
            callback: function(resp){
                log.req(url.value,resp);
            },
            onError: log.err
        });
    };
})(window.document); 

//automated calls
(function(){
    var ACC = { 
      userName: TESTDATA.ACCOUNT.name,
      userPass: TESTDATA.ACCOUNT.pass,
      userNameNew: 'brillout_test_account' + (Math.random()*10000000 | 0),
      userPassNew: 'crackme'
    }; 

    var calls = [ 
        ['session/signin'               ,[ACC.userName,ACC.userPass],'sid'],
        ['users/getMyself'              ,[],'user'],
        ['users/getAll'                 ,[],'users'],
        ['users/getOther'               ,['{{savedData.users.0.id}}'],null],
        ['sensors/get'                  ,[],'sensors'],
        ['sensors/open'                 ,['{{savedData.sensors.0.id}}'],null],
        ['tags/get'                     ,[],'tags'],
        ['groups/user/create'           ,['brillout_test_user_group'  ,'{{savedData.user.groups.0.id}}'],'newGroupUser'  ],
        ['groups/sensor/create'         ,['brillout_test_sensor_group','{{savedData.user.groups.0.id}}'],'newGroupSensor'],
        ['groups/tag/create'            ,['brillout_test_tag_group'   ,'{{savedData.user.groups.0.id}}'],'newGroupTag'   ],
        ['groups/user/addToGroup'       ,['{{savedData.newGroupUser.id}}'  ,'{{savedData.user.id}}'     ],null],
        ['groups/user/removeFromGroup'  ,['{{savedData.newGroupUser.id}}'  ,'{{savedData.user.id}}'     ],null],
        ['groups/sensor/addToGroup'     ,['{{savedData.newGroupSensor.id}}','{{savedData.sensors.0.id}}'],null],
        ['groups/sensor/removeFromGroup',['{{savedData.newGroupSensor.id}}','{{savedData.sensors.0.id}}'],null],
      //['groups/tag/addToGroup'        ,['{{savedData.newGroupTag.id}}'   ,'{{savedData.tags.0.id}}'   ],null],
      //['groups/tag/removeFromGroup'   ,['{{savedData.newGroupTag.id}}'   ,'{{savedData.tags.0.id}}'   ],null],
        ['groups/tag/addToGroup'        ,[576,571],null],
        ['groups/tag/removeFromGroup'   ,[576,571],null],
        ['groups/user/get'              ,[],'user_groups'],
        ['groups/sensor/get'            ,[],'sensor_groups'],
        ['groups/tag/get'               ,[],'tag_groups'],
        ['tags/claim'                   ,['4286431128','"{{savedData.user.groups.0.id}}"','575'],null],
        ['groups/user/remove'           ,['{{savedData.newGroupUser.id}}'  ],null],
        ['groups/sensor/remove'         ,['{{savedData.newGroupSensor.id}}'],null],
        ['groups/tag/remove'            ,['{{savedData.newGroupTag.id}}'   ],null],
        ['permissions/tags'             ,['{{savedData.sensors.1.id}}'],   'tag_wperm'],
        ['permissions/sensors'          ,['{{savedData.tags.0.id}}'   ],'sensor_wperm'],
        ['permissions/remove'           ,['{{savedData.tag_groups.0.id}}','{{savedData.sensor_groups.0.id}}'],null],
        ['permissions/post'             ,['{{savedData.tag_groups.0.id}}','{{savedData.sensor_groups.0.id}}'],null]
      //['permissions/remove'           ,['{{savedData.tag_wperm.groups.3}}','{{savedData.sensor_wperm.groups.3}}'],null],
      //['permissions/post'             ,['{{savedData.tag_wperm.groups.3}}','{{savedData.sensor_wperm.groups.3}}'],null],
      //['permissions/remove'           ,[269,21],null],
      //['permissions/post'             ,[269,21],null]
    ]; 

    var exhautive = calls.concat([ 
        ['users/register'    ,[ACC.userNameNew,ACC.userPassNew],null],
        ['session/signin'    ,[ACC.userNameNew,ACC.userPassNew],'sid'],
        ['session/signout'   ,[], null],
        ['session/signin'    ,[ACC.userNameNew,ACC.userPassNew],'sid'],
        ['session/signoutAll',[], null],
        ['session/signin'    ,[ACC.userName,ACC.userPass],'sid']
    ]); 

    /*
    exhautive = [ 
        ['session/signin'      ,[ACC.userName,ACC.userPass],'sid'],
        ['session/signout'   ,[], null]
    ]; 
    */

    var savedData;
    function doCalls(calls_,i){ 
        if(i===0) savedData = {};
        window.savedData = savedData;
        console.log(calls_.length,i);
        if( i>=calls_.length ) {
            callback();
            return;
        }

        var call_data_path = calls_[i][0];
        var call_data_args = calls_[i][1];
        var call_data_targ = calls_[i][2];

        //get endpoint out of path
        var endpoint_ = (function(){
            var current = endpoint;
            call_data_path.split('/').forEach(function(dir){
                current = current[dir];
                if( !current ) throw 'no '+dir;
            });
            return current;
        })();

        //process input
        call_data_args=call_data_args.map(function(data){
            var regex = /{{savedData\.(.*)}}/;
            var path = data.constructor===String && data.match(regex) && data.match(regex)[1];
            if( !path ) return data;
            var val = savedData;
            path.split('.').forEach(function(prop){
                val = val[prop];
                if( !val ) {
                    var errMsg = "ERR; missing " + prop + " in savedData."+path;
                    utils.assert(false,errMsg);
                }
            });
            if( /^{{.*}}$/.test(data) ) return val;
            utils.assert(/^\"{{.*}}\"$/.test(data));
            return val.toString();
        });

        //call endpoint
        endpoint_.status=1;
        endpoint_.apply(null,
            call_data_args.concat([function(resp){
                endpoint_.status=2;
                if( call_data_targ ) savedData[call_data_targ]=resp;
                log.req(call_data_path,resp);
               //etTimeout(function(){
                doCalls(calls_,i+1);
              //},100);
            }]).concat([log.err])
        );
    } 

    doCalls(exhautive,0);

    function callback(){ 
        function checkCoverage(){ 

            var endpoints = [];
            //check coverage of test calls
            (function checkEndpointObj(endpoints_,path){ 
                utils.assert(endpoints_.constructor===Object);
                for(var i in endpoints_) {
                    if( i[0]!=='_' ) {
                        var newPath = path+'.'+i;
                        if ( endpoints_[i].constructor===Function ) {
                            endpoints.push(endpoints_[i]);
                            if ( !endpoints_[i].status ) log.missing('test endpoint'+newPath);
                        }
                        else checkEndpointObj(endpoints_[i],newPath);
                    }
                }
            })(endpoint,''); 

            //check coverage of endpoint object
            endpoint._call({ 
                url: '/management/',
                method: 'GET',
                noPaging: true,
                callback: function(resp){
                    var endpoints_backend = resp['result']['routes'].filter(function(route){
                        if(/\/management\/$/.test(route['url'])) return false;
                        var dir = route['url'].match(/^\/(.*?)(?=\/)/)[1];
                        if( dir==='static' ) return false;
                        if( dir==='demo'   ) return false;
                        utils.assert(dir==='pre');
                        return true;
                    }).map(function(route){
                        return route['methods'].filter(function(m){
                            return ['GET','POST','DELETE'].indexOf(m)!==-1;
                        }).map(function(m){
                            var url = route['url'].replace(/^\/.*?(?=\/)/,'').replace(/<.*?>/g,'%');
                            url = url.replace('act/%','act/open');
                            return m + ' ' + url;
                        });
                    }).reduce(function(l,r){return l.concat(r)})
                      .filter(function(end){
                        if(/^POST \/[0-9]\/$/.test(end)) return false;
                        return true;
                      });
                    var endpoints_frontend = endpoints.map(function(end){
                        return end.backend.method + ' ' + end.backend.url;
                    });
                    endpoints_backend
                        .concat(endpoints_frontend)
                        .sort()
                        .map(function(end){
                            if( endpoints_backend .indexOf(end)>-1 &&
                                endpoints_frontend.indexOf(end)>-1 ) return 1;
                            if( endpoints_backend .indexOf(end)>-1 ) return 'endpoint Obj missing '+end;
                            if( endpoints_frontend.indexOf(end)>-1 ) return '/management/ missing '+end;
                            utils.assert(false);
                        })
                        .filter(function(end){return end!==1})
                        .forEach(log.missing);
                    log.endpoints(endpoints_backend.sort().join('<br>'));
                }
            }); 
        } 
        checkCoverage();
    }; 

    endpoint._config.onAfterRequest.push(function(){ 
        log.savedData(savedData);
    }); 
})();
