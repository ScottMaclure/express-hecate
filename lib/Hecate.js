/*global module require process */

// Object extension ala jQuery.extend.
var extend = require('extend');

/**
 * Constructor.
 * @param {object} options Configuration options.
 */
module.exports = function(options){

    // Set the config options.
    this.options = extend({}, this.__defaults, options);

    // Initialise our array of routes.
    this.routes = [];
};

/**
 * Defines a Hecate instance.
 */
module.exports.prototype = {

    /**
     * Define default parameters.
     */
    __defaults: {
        controllersPath: 'app/controllers/',
        rootPath: process.cwd() + '/',
        routesFile: 'config/routes.conf',
        templateVar: 'Hecate'
    },

    // Accepted HTTP verbs.
    __verbs: ['delete', 'get', 'post', 'put'],

    /**
     * Handles binding the fields of an object into a URL.
     * @param {string} url The URL to bind against.
     * @param {object} val The object from which to draw properties.
     * @return {string} The updated URL.
     */
    bindObject: function(url, val){

        // Create a new object that we can manipulate safely.
        var object = extend({}, val);

        // Flag so we remember to append any attributes that can't be bound.
        var append = false;

        // If there are still parameters to bind, pull them out.
        // Note: We use a different regex here because we need the global flag to ensure we pull all remaining bindings.
        var remaining = url.match(/:\w+/ig);
        if (remaining && remaining.length > 0){

            // Iterate over the remaining potential bindings, looking for matches by name.
            for (var j = 0; j < remaining.length; j++){

                // Grab the key, stripping the : character.
                var key = remaining[j].replace(':', '');

                // Does our object contain that key?
                if (object[key] !== undefined){

                    // If it does, replace that value.
                    var keyRegex = new RegExp(':' + key);
                    url = url.replace(keyRegex, object[key]);

                    // Now remove that key from the object.
                    delete object[key];
                }
            }

            // If there are still fields left on our object, they need to become query parameters.
            if (object !== {}){
                append = true;
            }
        }

        // Otherwise, we're going to append the object's values as key/value pairs.
        else {
            append = true;
        }

        // If we need to append key/values, do so.
        if (append){

            for (var attr in object){

                // How are we appending?
                var joiner = (url.indexOf('?') >= 0) ? "&" : "?";

                // Append.
                url += joiner + attr + "=" + object[attr];
            }
        }

        return url;
    },

    /**
     * Binds the loaded routes against the passed app.
     * @param {object} app An Express app instance to bind routes against.
     */
    bindRoutes: function(app){

        // Cache the instance.
        var self = this;

        // Insert the instance into app.locals so it can be used in views.
        app.locals[self.options.templateVar] = self;

        // Grab the routes.
        var routes = self.getRoutes();

        // Bind them.
        routes.forEach(function(route){

            // Load the controller.
            var controller = require(self.options.rootPath + self.options.controllersPath + route.controller);

            // Bind the route.
            app[route.verb](route.path, controller[route.method]);
        });
    },

    /**
     * Binds the given parameters into the given URL.
     * Used ala Router.reverse() in Play!
     * @param {string} url The URL pattern to bind against.
     * @param {mixed} params A varargs collection of parameters to bind.
     */
    bindUrl: function(url, params){

        // If the parameters weren't in the form of an array, fix that.
        if (!(params instanceof Array)){
            params = [params];
        }

        // Compile the regex used for matching named URL parameters.
        var regex = /:\w+/i;

        // If they provided parameters, try to use them.
        if (params.length > 0) {

            // Keep going so long as there are parameters to attempt to bind.
            for (var i = 0; i < params.length; i++) {

                // Grab the value.
                var val = params[i];

                // If it's an object, we treat it slightly differently.
                if (typeof val == "object") {
                    url = this.bindObject(url, val);
                }

                // Otherwise, replace the next variable in the string with the value.
                else {
                    url = url.replace(regex, val);
                }
            }

        }

        // If, after all processing, the URL is still missing bits, throw an exception.
        // We do this afterwards to avoid having to guess whether objects are going to populate our string properly.
        if (url.indexOf(':') >= 0){

            // Tell them which variable they missed.
            throw new Error('Insufficient parameters passed. Unable to bind: ' + url.match(regex)[0]);
        }

        return url;
    },

    /**
     * Returns an array of objects encapsulating the routes to be configured.
     * @return {array} The routes to configure, as objects.
     */
    getRoutes: function(){

        // Cache the instance.
        var self = this;

        // If we've already loaded the routes, skip.
        if (self.routes.length === 0){

            // Grab the entries.
            var routes = self.readFile(self.options.rootPath + self.options.routesFile);

            // Turn them into actual route entries.
            routes.forEach(function(route){

                // Split it up into its component parts (VERB /path controller.method).
                // TODO: An equivalent to PHP's list() would be really awesome too.
                var bits = route.split(/\s+/);

                // Split the controller up further, so we can store the file and method separately.
                var controller = bits[2].split('.');

                // Create an actual object.
                var entry = {
                    verb: bits[0].toLowerCase(),
                    path: bits[1],
                    controller: controller[0],
                    method: controller[1]
                };

                // Only add the route if we recognise the verb.
                if (self.__verbs.indexOf(entry.verb) >= 0){
                    self.routes.push(entry);
                }

                // Otherwise, they've made a mistake in their config, so throw an error.
                else {
                    throw new Error('Unrecognised HTTP verb for route: ' + entry.path);
                }
            });
        }

        return self.routes;
    },

    /**
     * Reads a config file from disk, skipping empty lines and commented ones.
     * @param {string} path The path to the file to read.
     */
    readFile: function(path){

        // Define the array we'll return.
        var routes = [];

        // Grab the FS library.
        var fs = require('fs');

        // Read the contents from disk.
        var array = fs.readFileSync(path).toString().split("\n");

        // We need to post-process since there might have been empty lines, or comments.
        array.forEach(function(route){

            // If it's not an empty line or a comment, add it.
            if (route !== "" && route.match(/^#/) === null) {
                routes.push(route);
            }
        });

        return routes;
    },

    /**
     * Given an action and an optional set of parameters, returns the URL to be used.
     * @param {string} action The URL to bind.
     * @return {string} A function which accepts a variable number of parameters and binds those to places in the URL.
     */
    reverse: function(action){

        var url;
        var error;

        // Iterate over the routes, looking for a match.
        var routes = this.getRoutes();
        for (var i = 0; url === undefined && i < routes.length; i++){

            try {

                // Simplify access.
                var route = routes[i];

                // Check the controller + method. If we find one, figure out the URL to return.
                if (action == route.controller + '.' + route.method){

                    var params = [];

                    // If there are parameters, bind them.
                    if (arguments.length > 1) {

                        // Turn them into a proper array.
                        params = Array.prototype.slice.apply(arguments);

                        // And drop the first entry (which was the action itself).
                        params = params.slice(1);
                    }

                    // We always call bind, even with an empty array, to see if we generate an error.
                    url = this.bindUrl(route.path, params);
                }
            }

            catch(e){

                // Store the error in case we need to rethrow it.
                error = e;
            }

        }

        // If we found a match, return it.
        if (url !== undefined) {
            return url;
        }

        // Otherwise, throw an exception.
        else {

            // If we captured an earlier error, reuse that (since it implies we found a match but couldn't bind it).
            if (error !== undefined) {
                throw error;
            }

            else {
                throw new Error("No matching action was found.");
            }
        }
    }
};