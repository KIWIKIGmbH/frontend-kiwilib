describe('API/JS',function() {
    it('should be loaded', function() { 
        expect(utils.module.load('config').ENDPOINT_ROOT).toBeDefined();
        expect(api).toBeDefined();
    }); 
});

describe('API/BackEnd',function() {
    function doReq(callback,opts){ 
        opts = opts || {};
        var req = new XMLHttpRequest();
        req.open(
            opts.method||'POST',
            utils.module.load('config').ENDPOINT_ROOT+(opts.path||'/session/'),
            true
        );
        req.setRequestHeader('Content-Type',opts.contentType||'application/json; charset=utf-8');
        req.send(JSON.stringify(opts.data || {'username':TESTDATA.ACCOUNT.name,'password':TESTDATA.ACCOUNT.pass}));
        var finished;
        req.onreadystatechange=function(){
            if(req.readyState===4) {
                finished=true;
                callback(req);
            }
        };
        waitsFor(function(){
            return finished;
        },'req to server',REQ_TIMEOUT);
    } 
    it('should be running', function() { 
        var req;
        doReq(function(_req){
            req = _req;
        });
        runs(function(){
            expect(req.status).toBe(200);
        });
    }); 
    it('should reply well formated response', function() { 
        var req;
        doReq(function(_req){
            req = _req;
        });
        runs(function(){
            expect(req).toBeDefined();
            expect(req.status).toBe(200);
            expect(req.responseText).toBeDefined();
            var cantBeParsed;
            var resp;
            try {
                resp = JSON.parse(req.responseText);
            }catch(e){
                cantBeParsed = true;
            }
            expect(cantBeParsed).not.toBeDefined();
            expect(resp).toBeDefined();
            expect(resp['status']).toBe('ok');
            expect(resp['result']).toBeDefined();
        });
    }); 
    function checkStatus(opts,status){ 
        var req;
        doReq(function(_req){
            req = _req;
        },opts);
        runs(function(){
            expect(req.status).toBe(status);
        });
    } 
    it('should reply 401 on wrong credentials', function() { 
        checkStatus({data:{username:'fakeAccount',password:''}},401);
    }); 
    it('should reply 400 on wrong POST request data', function() { 
        checkStatus({data:{username:'fakeAccount'}},400);
    }); 
    it('should reply 406 on wrong POST content type - 1', function() { 
        checkStatus({contentType:'application/brillout'},406);
    }); 
    /*
    it('should reply 406 on wrong POST content type - 2', function() { 
        checkStatus({contentType:'application/x-www-form-urlencoded'},406);
    }); 
    */
    it('should reply 404 on wrong URL', function() { 
        checkStatus({path:'/nonexistenturl/'},404);
    }); 
}); 

function signin() {
    it('should let user signin', function() { 
        var cbCalled = false;
        api.user.signin(TESTDATA.ACCOUNT.name,TESTDATA.ACCOUNT.pass,function() {
            cbCalled = true;
        });
        waitsFor(function() {
            return cbCalled;
        },'signin request',REQ_TIMEOUT);
        runs(function() {
            expect(api.user.isSigned()).toBe(true);
            expect(api.user.getName()).toBe(TESTDATA.ACCOUNT.name);
        });
    }); 
}

describe('API/Authentification', function() {
    signin();
    it('should let user signout', function() { 
        expect(api.user.isSigned()).toBe(true);
        api.user.signout();
        waitsFor(function() {
            return !api.user.isSigned();
        },'signout req',REQ_TIMEOUT);
        runs(function() {
            expect(api.user.isSigned()).toBe(false);
            expect(api.user.getName()).not.toBeDefined();
        });
    }); 
    signin();
    it('should let user signout all sessions', function() { 
        expect(api.user.isSigned()).toBe(true);
        api.user.signoutAll();
        waitsFor(function() {
            return !api.user.isSigned();
        },'signout all req',REQ_TIMEOUT);
        runs(function() {
            expect(api.user.isSigned()).toBe(false);
        });
    }); 
});

describe('API/Sensors-Tags',function() {
    signin();
    function reqNcheck(apiFct) { 
        var ret;
        apiFct(function(_ret){
            ret=_ret;
        },{type:'doors'});
        waitsFor(function(){
            return ret;
        },'server request',REQ_TIMEOUT);
        runs(function(){
            expect(ret).toEqual(jasmine.any(Array));
            expect(ret.length).toBeGreaterThan(0);
        });
    } 
    it('should be able to retrieve sensors', function() { 
        reqNcheck(api.sensors.get);
    }); 
    it('should be able to retrieve sensor groups', function() { 
        reqNcheck(api.sensors.groups.get);
    }); 
    it('should be able to retrieve tags', function() { 
        reqNcheck(api.tags.get);
    }); 
    it('should be able to retrieve tag groups', function() { 
        reqNcheck(api.tags.groups.get);
    }); 
});
