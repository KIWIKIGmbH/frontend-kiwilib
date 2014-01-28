(function(){
    var SCRIPTS = ['utils.js','config.js','endpoint.js','api.js','kiwilib.js'];
    function loadScript(url){ document.write('<script src="'+url+'"></script>'); }
    var port = parseInt(location.port,10);
    if( location.hostname==='localhost' && port>1330 && port<1339 ) {
        var origin = 'http://localhost:8000';
        SCRIPTS.forEach(function(js){
          loadScript( origin + '/' + js );
        });
    }
    else {
        var version = '0.0.1';
        var origin = [].slice.call(document.querySelectorAll('script')).pop().src.replace(/\/kiwilib.js.*/,'');
        loadScript( origin + '/'+version+'/all.min.js' );
    }
})();
