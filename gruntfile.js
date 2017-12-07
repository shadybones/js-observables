module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> ES5 v<%= pkg.version %> */\n'
            },
            build: {
                src: 'src/Observer.es5.js',
                dest: 'dist/observable.min.js'
            }
        },
        "uglify-es" : {
            options: {
                banner: '/*! <%= pkg.name %> ES6 v<%= pkg.version %> */\n'
            },
            build: {
                src: 'src/Observer.es6.js',
                dest: 'dist/observable.es6.min.js'
            }
        }
    });
    //copy:src/Observer.es6.js:dist/observable.es6.js
    grunt.registerTask('copy', 'copy a file from, to', function (srcFile, dstFile) {
        try{
            grunt.file.write(dstFile, grunt.file.read(srcFile));
            grunt.log.ok('file copied: '.blue + srcFile);
        }catch(e){
            grunt.log.warn('File not accessible. '+srcFile);
        }
    });

    //uglify-es:src/Observer.es6.js:dist/observable.es6.min.js
    grunt.registerTask('uglify-es', 'copy a file from, to', function (srcFile, dstFile) {
        try{
            srcFile = srcFile || grunt.config.get("uglify-es").build.src;
            dstFile = dstFile || grunt.config.get("uglify-es").build.dest;
            var UglifyJS = require('uglify-es'),
                uglified = UglifyJS.minify( grunt.file.read(srcFile)),
                banner = grunt.config.get("uglify-es").options && grunt.config.get("uglify-es").options.banner || "";
            banner && (banner += '\n\n');

            grunt.file.write(dstFile, banner + uglified.code);
        }catch(e){
            grunt.log.warn('File not accessible. '+srcFile, e);
        }
    });


    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('build-es5', ['uglify']);
    grunt.registerTask('build-es6', ['uglify-es']);
    // Default task(s).
    grunt.registerTask('default', ['build-es5','build-es6']);

};