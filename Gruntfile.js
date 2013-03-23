/*global module */

module.exports = function(grunt) {

    // Load dependencies.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-regarde');

	/**
	 * Define our Grunt configuration.
	 */
	grunt.initConfig({

		/**
		 * Define the files we'll validate.
		 */
		jshint: {
            /**
             * Define the validation options to apply.
             * See: http://www.jshint.com/docs/
             */
			options: {
				browser: true,
				curly: true,
				eqnull: true,
				immed: true,
				jquery: true,
				newcap: true,
				noarg: true,
				smarttabs: true,
				sub: true,
				undef: true,
				unused: true
			},
			all: ['Gruntfile.js',
                'package.json',
                'lib/**/*.js',
                'test/**/*.js']
		},
		
		/**
		 * Allow Grunt to run by itself.
		 */
		regarde: {
			scripts: {
				files: '<%= jshint.all %>',
				tasks: 'jshint'
			}
		}
	});
	
	// By default, just run lint.
	grunt.registerTask('default', 'jshint');
};