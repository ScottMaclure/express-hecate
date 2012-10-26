/*globals module require process */

// Object extension ala jQuery.extend.
var extend = require('extend');

/**
 * Constructor.
 * @param object options Configuration options.
 */
module.exports.Router = function(options){

    // Set the config options.
    this.options = extend({}, this.__defaults, options);

    // Initialise our array of routes.
    this.routes = [];
};

/**
 * Defines a Router instance.
 */
module.exports.Router.prototype = {

    /**
     * Define default parameters.
     */
    __defaults: {
        controllersPath: 'app/controllers/',
        rootPath: process.cwd() + '/',
        routesFile: 'config/routes.conf'
    },

    /**
     * Handles binding the fields of an object into a URL.
     * @param url [string] The URL to bind against.
     * @param val [object] The object from which to draw properties.
     * @return [string] The updated URL.
     */
    bindObject: function(url, val){

        // Create a new object that we can manipulate safely.
        var object = extend({}, val);

        // Flag so we remember to append any attributes that can't be bound.
        var append = false;

        // If there are still parameters to bind, pull them out.
        // Note: We use a different regex here because we need the global flag to ensure we pull all remaining bindings.
        var remaining = url.match(/:\w+/ig);
        if (remaining.length > 0){

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
     * @param app [object] An Express app instance to bind routes against.
     */
    bindRoutes: function(app){

        // Cache the instance.
        var self = this;

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
     * @param url [string] The URL pattern to bind against.
     * @param params [mixed] A varargs collection of parameters to bind.
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

            // If, after all processing, the URL is still missing bits, throw an exception.
            // We do this afterwards to avoid having to guess whether objects are going to populate our string properly.
            if (url.indexOf(':') >= 0){

                // Tell them which variable they missed.
                throw new Error('Insufficient parameters passed. Unable to bind: ' + url.match(regex)[0]);
            }
        }

        return url;
    },

    /**
     * Returns an array of objects encapsulating the routes to be configured.
     * @return Array The routes to configure, as objects.
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

                // Add the entry.
                self.routes.push(entry);
            });
        }

        return self.routes;
    },

    /**
     * Reads a config file from disk, skipping empty lines and commented ones.
     * @param path [string] The path to the file to read.
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
     * @param action [string] The URL to bind.
     * @return string A function which accepts a variable number of parameters and binds those to places in the URL.
     */
    reverse: function(action){

        var match;

        // Iterate over the routes, looking for a match.
        var routes = this.getRoutes();
        for (var i = 0; match === undefined && i < routes.length; i++){

            var route = routes[i];

            // Check the controller + method.
            if (action == route.controller + '.' + route.method){
                match = route;
            }
        }

        // If we find one, figure out the URL to return.
        if (match !== undefined){

            // If there are parameters, bind them.
            if (arguments.length > 1) {

                // Turn them into a proper array.
                var params = Array.prototype.slice.apply(arguments);
                return this.bindUrl(match.path, params);
            }

            // Otherwise just return the string.
            else {
                return match.path;
            }
        }

        // Otherwise, throw an exception.
        else {
            throw new Error("No matching action was found.");
        }
    }
};