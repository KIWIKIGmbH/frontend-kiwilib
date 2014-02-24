/*
===TODO
-more powerful JS minifying, e.g. closure compiler

===Building decisions
-Bower not used, because;
  -retrieves whole repository instead of single min.js
-RequireJS not used, because;
  -code required to be added to lib files
*/
module.exports = function(grunt) {
    var SOURCE_KIWILIB = 'src/';

    var TARGET = 'build/';
    var TARGET_KIWILIB = TARGET+'<%= pkg.version %>/all.min.js';
    var TARGET_LOADER  = TARGET+'kiwilib.js';

    var JS_ORDER_HTML = 'js-order.html';

    var BANNER = '/*\n KIWI.KI library v<%= pkg.version%>\n (c) 2013-2014 KIWI.KI GmbH, http://kiwi.ki\n License: MPL\n*/\n"use strict";';

    var JS_FILES_TO_LINT = ['*.js','src/*.js'];

    var GLOBALS = [ 
        '$',
        'angular',
        'api',
        'assert',
        'beforeEach',
        'config',
        'expect',
        'describe',
        'inject',
        'it',
        'jasmine',
        'localStorage',
        'location',
        'module', /*for gruntfile.js*/
        'runs',
        'XMLHttpRequest',
        'waitsFor',
        'window'
    ]; 
    var GLOBALS_OBJ = {};
    GLOBALS.forEach(function(gl){
        GLOBALS_OBJ[gl]=true;
    });

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: { 
            banner1: {
                options: {
                    banner: BANNER
                },
                src: [TARGET_KIWILIB],
                dest: TARGET_KIWILIB
            },
            banner2: {
                options: {
                    banner: BANNER.replace('library','library loader')
                },
                src: [TARGET_LOADER],
                dest: TARGET_LOADER
            }
        }, 
        clean: { 
            all: [TARGET]
        }, 
        'dom_munger': { 
            read: {
                options: {
                    read: {selector:'script',attribute:'src',writeto:'jsRefs',isPath:true}
                },
                src: JS_ORDER_HTML
            }
        }, 
        jshint: { 
            options: { 
                /* restrictive options */
                bitwise       : true,
                camelcase     : true,
                curly         : false,
                eqeqeq        : true,
                forin         : false,
                immed         : true,
                indent        : 4,
                latedef       : true,
                newcap        : true,
                noarg         : true,
                noempty       : true,
                nonew         : true,
                plusplus      : false,
                quotmark      : 'single',
                undef         : true,
                unused        : true,
                strict        : false, /*use strict added in building step*/
                trailing      : false, /*trailing whitespace used as vim fold markers*/
                maxparams     : false,
                maxdepth      : false,
                maxstatements : false,
                maxcomplexity : false,
                maxlen        : 200,
                /* permissive options */
                sub           : true,
                globals       : GLOBALS_OBJ
            }, 
            files: {
                src: JS_FILES_TO_LINT
            }
        }, 
        jslint: { 
            lint: {
                directives: {
                    browser: true,
                    predef: GLOBALS,
                    nomen: true,
                    sloppy: true,
                    sub: true,
                    vars: true,
                    white: true
                },
                src: JS_FILES_TO_LINT
            }
        }, 
        uglify: { 
            options: {
                mangle: false
            },
            kiwilib: {
                src: ['<%= dom_munger.data.jsRefsKiwilib %>'],
                dest: TARGET_KIWILIB
            },
            kiwilibLoader: {
               src: [SOURCE_KIWILIB + 'loader.js'],
               dest: TARGET_LOADER
            }
        } 
    });

    grunt.registerTask('computeJsRefsKiwilib',function(){ 
        grunt.config.set('dom_munger.data.jsRefsKiwilib',
            grunt.config.get('dom_munger.data.jsRefs')
            .filter(function(ref){
               return /^src\//.test(ref) && ref.indexOf('loader.js')===-1;
            })
        );
    }); 

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-dom-munger');
    grunt.loadNpmTasks('grunt-jslint');

    grunt.registerTask('build',[
        'clean:all',
        'dom_munger:read',
        'computeJsRefsKiwilib',
        'uglify:kiwilib',
        'uglify:kiwilibLoader',
        'concat:banner1',
        'concat:banner2'
    ]);
    grunt.registerTask('lint',[
      /*'jslint', jslint not used because to strict on If-Block Braces and no way to disable parts of whitespace rules*/
        'jshint'
    ]);
    grunt.registerTask('default',['lint','build']);
};
