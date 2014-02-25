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
    } 
};
