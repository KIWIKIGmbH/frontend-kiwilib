(function(){
    // The components of KIWILIB
    var SCRIPTS = ['utils.js','config.js','endpoint.js','api.js','kiwilib.js'];

    // Whether to load the minified version or not
    var DEBUG = false;

    // Helper function to 'lazy include' javascript
    function loadScript(url){ document.write('<script src="'+url+'"></script>'); }

    // Figure out where we're being loaded from
    var origin = [].slice.call(document.querySelectorAll('script')).pop().src.replace(/\/kiwilib.js.*/,'');

    // What version of KIWILIB to load
    var version = '0.0.1';
    if( DEBUG ) {
        SCRIPTS.forEach(function(js){
          loadScript( origin + '/' + version + '/src/' + js );
        });
    } else {
        loadScript( origin + '/'+version+'/all.min.js' );
    }
})();
