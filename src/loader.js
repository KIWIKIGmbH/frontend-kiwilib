(function(){
    function loadScript(url){ document.write('<script src="'+url+'"></script>'); }
    if( location.hostname==='localhost' && location.port==='1337' ) {
        var origin = 'http://localhost:8000';
        ['utils.js','config.js','endpoint.js','api.js','kiwilib.js'].forEach(function(js){
          loadScript( origin + '/src/' + js );
        });
    }
    else {
        var version = '0.0.1';
        var origin = [].slice.call(document.querySelectorAll('script')).pop().src.replace(/\/kiwilib.js.*/,'');
        loadScript( origin + '/'+version+'/all.min.js' );
    }
})();
