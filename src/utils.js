var utils = {
    assert: (function(){ 
        function ret(assertion){
            if( assertion ) return;

            var fctLine = (function(){
                var errorStack = new Error().stack;
                if(!errorStack) return 'unknown_line';
                var skipCallFcts=2;
                do {
                    errorStack = errorStack.replace(/.*[\s\S]/,'');
                }while(skipCallFcts--)
                return /[^\/]*$/.exec(errorStack.split('\n')[0]).toString().replace(/\:[^\:]*$/,'');
            })();

            var args = arguments;
            listeners.forEach(function(l){
                l('[ASSERTION FAIL '+fctLine+'] ' + [].slice.call(args,1).join(' -- '));
            });
        }
        var listeners=[];
        ret.addListener=function(fct){ listeners.push(fct) };
        //'c'+'onsole' avoids hit on s/co
        if( window['c'+'onsole'] ) ret.addListener(function(msg){window['c'+'onsole']['log'](msg)});
        return ret;
    })(), 
    exception: function(){ 
        this.assert.call(arguments);
    }, 
    module: (function(){ 
        var modules={};
        return {
          save: function(moduleName,module){
              if(!module || !module.constructor===Object) throw 'module should be an Object';
              modules[moduleName]=module;
          },
          load: function(moduleName) {
              return modules[moduleName];
          }
        }
    })(), 
    storage: { 
        get: function get(key)     { return localStorage[key]; },
        set: function set(key,val) { localStorage[key]=val;    },
        del: function del(key)     { if(!key) localStorage.clear(); else delete localStorage[key] }
    }, 
    req: function(method,url,data,onSuccess){ 
        var req = new XMLHttpRequest();
        req.onreadystatechange = function(){
            if( req.readyState===4 ) onSuccess && onSuccess(req.responseText,req);
        };
        if(method==='GET' && data) {
            url += '?'+Object.keys(data).map(function(key){return key+'='+window.encodeURIComponent(data[key])}).join('&');
        }
        req.open(method,url,true);
        req.setRequestHeader('Content-Type'    ,'application/json; charset=utf-8');
        req.setRequestHeader('Accept'          ,'application/json, text/javascript, */*; q=0.01');
        req.setRequestHeader('X-Requested-With','XMLHttpRequest');

        req.send( method!=='GET' && data || undefined);
    } 
};
