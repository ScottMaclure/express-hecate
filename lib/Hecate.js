/*global module, require, process */

// Object extension ala jQuery.extend.
var express = require('express');
var extend = require('extend');
var fs = require('fs');

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
     * Add a new route entry that's been parsed.
     * @param {String} verb The HTTP verb for the route.
     * @param {String} path The relative URL for the route.
     * @param {String} controller The path to the controller to use for serving the route.
     * @param {String} method The name of the method on the controller to use for serving the route.
     */
    addNewRouteEntry: function(verb, path, controller, method){

        // Only add the route if we recognise the verb.
        if (this.__verbs.indexOf(verb) >= 0){

            // Create an actual object.
            var entry = {
                verb: verb,
                path: path,
                controller: controller,
                method: method
            };

            this.routes.push(entry);
        }

        // Otherwise, they've made a mistake in their config, so throw an error.
        else {
            throw new Error('Unrecognised HTTP verb for route: ' + path);
        }

    },

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

                    // Is it a type we can serialise?
                    if (this.canSerialise(object[key])){

                        // If it is, replace that value.
                        var keyRegex = new RegExp(':' + key);
                        url = url.replace(keyRegex, object[key]);
                    }

                    // Even if it wasn't, delete the value so we don't try again later.
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

                // If the value is an object or a function, ignore it.
                if (this.canSerialise(object[attr])){

                    // How are we appending?
                    var joiner = (url.indexOf('?') >= 0) ? "&" : "?";

                    // Append.
                    url += joiner + attr + "=" + object[attr];
                }
            }
        }

        return url;
    },

    /**
     * Handles binding a regular, boring route => controller combination on the provided app.
     * @param {Object} app The application to bind against.
     * @param {Object} route The details of the route to bind.
     */
    bindRegularRoute: function(app, route){

        var self = this;

        var controller;
        var controllerPath = self.options.controllersPath + route.controller;

        // Load the controller.
        try {
            controller = require(self.options.rootPath + controllerPath);
        }
        catch (e) {
            throw new Error('The specified controller (' + controllerPath + ') does not exist.');
        }

        if (controller) {

            // If the specified method does not exist, throw an exception.
            if (controller[route.method] === undefined) {
                throw new Error('The specified method (' + route.method + ') does not exist on the controller (' + controllerPath + ').');
            }

            // Bind the route.
            app[route.verb](route.path, controller[route.method]);
        }
    },

    /**
     * Handles binding a particular folder to be served statically by Express.
     * @param {Object} app The application to bind against.
     * @param {Object} route The details of the route to bind.
     */
    bindStaticRoute: function(app, route){

        var self = this;

        // Figure out the folder they want to bind.
        var folderPath = route.controller.replace(/staticDir:/g, '');
        var folder = self.options.rootPath + folderPath;

        // Make sure that's actually a folder.
        try {
            var info = fs.lstatSync(folder);
            if (info.isDirectory()) {
                app.use(express.static(folder));
            }
        }
        catch (e) {
            throw new Error('The specified static path (' + folderPath + ') does not exist or is not a directory.');
        }
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

            // If the controller begins with 'staticDir:', it's a static route.
            if (route.controller.indexOf('staticDir:') === 0) {
                self.bindStaticRoute(app, route);
            }

            else {
                self.bindRegularRoute(app, route);
            }
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
     * Check if a given value can be safely serialised for inclusion in a URL.
     * @param val The value we're considering serialising.
     * @return {Boolean} True if that value can be serialised.
     */
    canSerialise: function(val){
        return typeof val !== 'object' && typeof val !== 'function';
    },

    /**
     * Returns an array of objects encapsulating the routes to be configured.
     * @return {Array} The routes to configure, as objects.
     */
    getRoutes: function(){

        // If we've already loaded the routes, skip.
        if (this.routes.length === 0){

            // Grab the entries.
            var routes;
            try {
                routes = this.readFile(this.options.rootPath + this.options.routesFile);
            }
            catch (e) {
                throw new Error('The specified routes file (' + this.options.routesFile + ') does not exist or could not be read.');
            }

            // Turn them into actual route entries.
            for (var i = 0; i < routes.length; i++){

                // Split it up into its component parts (VERB /path controller.method).
                // TODO: An equivalent to PHP's list() would be really awesome too.
                var bits = routes[i].split(/\s+/);

                // Split the controller up further, so we can store the file and method separately.
                var controller = bits[2].split('.');

                // If the controller contains a wildcard, we handle it differently.
                if (controller[1] == '{method}') {
                    this.getWildcardRoutes(bits[0].toLowerCase(), bits[1], controller[0]);
                }

                else {
                    this.addNewRouteEntry(bits[0].toLowerCase(), bits[1], controller[0], controller[1]);
                }
            }
        }

        return this.routes;
    },

    /**
     * Generate the various routes represented by a wildcard controller entry.
     * @param {String} verb The HTTP verb for the route.
     * @param {String} path The relative URL for the route.
     * @param {String} controllerName The path to the controller to use for serving the route.
     */
    getWildcardRoutes: function(verb, path, controllerName){

        // Load the referenced controller.
        var controllerPath = this.options.controllersPath + controllerName;
        try {
            var controller = require(this.options.rootPath + controllerPath);

            // Iterate over the controller, creating new route entries for each function.
            for (var field in controller) {

                if (typeof controller[field] == 'function') {
                    this.addNewRouteEntry(verb, path.replace(/{method}/, field), controllerName, field);
                }
            }
        }
        catch (e) {
            throw new Error('The specified controller (' + controllerPath + ') does not exist.');
        }
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

            catch(e) {

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