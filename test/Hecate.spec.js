/*global describe, it, require, beforeEach, afterEach, expect */

var Hecate = require('../lib/Hecate.js');
var sinon = require('sinon');

/**
 * Tests for the Hecate implementation.
 */
describe('Hecate', function(){

    var router;
    var spy;

    beforeEach(function(){
        router = new Hecate({
            controllersPath: 'test/helpers/controllers/',
            routesFile: 'test/helpers/routes.conf'
        });
    });

    // If we used a spy, restore it.
    afterEach(function(){
        if (spy !== undefined){
            spy.restore();
        }
    });

    it('uses sensible defaults', function(){

        // Create a default router.
        router = new Hecate();

        // Verify.
        expect(router.options.controllersPath).toBe('app/controllers/');
        expect(router.options.routesFile).toBe('config/routes.conf');
        expect(router.options.templateVar).toBe('Hecate');
    });

    it('stores config options', function(){

        // Create a customised router.
        router = new Hecate({
            controllersPath: 'something/',
            routesFile: 'some.file',
            templateVar: 'Router'
        });

        // Verify.
        expect(router.options.controllersPath).toBe('something/');
        expect(router.options.routesFile).toBe('some.file');
        expect(router.options.templateVar).toBe('Router');
    });

    describe('when loading the routes', function(){

        it('parses the specified routes file', function(){

            // Parse the routes.
            var routes = router.getRoutes();

            // Make sure we get some.
            expect(routes.length).toBeGreaterThan(0);

            // Grab the first one.
            var route = routes[0];

            // Verify it.
            expect(route.verb).toBe('get');
            expect(route.path).toBe('/');
            expect(route.controller).toBe('app');
            expect(route.method).toBe('index');
        });

        it('stores the loaded routes for future reuse', function(){

            // Spy on the readFile method.
            spy = sinon.spy(router, 'readFile');

            // Load the routes.
            var routes = router.getRoutes();

            // Verify the method was called.
            expect(spy.calledOnce).toBe(true);

            // Load them again.
            routes = router.getRoutes();

            // Ensure it wasn't called again.
            expect(spy.calledOnce).toBe(true);
        });

        it('throws an exception if the routes file does not exist', function(){

            // Create a customised router.
            router = new Hecate({
                routesFile: 'nothing.conf'
            });

            // Parse.
            expect(function(){
                router.getRoutes();
            }).toThrow(new Error('The specified routes file (nothing.conf) does not exist or could not be read.'));
        });

        it('throws an exception for unrecognised HTTP verbs', function(){

            // Create a customised router.
            router = new Hecate({
                routesFile: 'test/helpers/broken_configs/invalid_verb.conf'
            });

            // Parse.
            expect(function(){
                router.getRoutes();
            }).toThrow(new Error('Unrecognised HTTP verb for route: /test'));
        });

        describe('when handling wildcard method binding', function(){

            it('creates a binding for each function on the specified controller', function(){

                // Parse the routes.
                var routes = router.getRoutes();

                // Make sure entries were created for the 3 relevant methods.
                expect(routes[8].path).toBe('/info/index');
                expect(routes[9].path).toBe('/info/faqs');
                expect(routes[10].path).toBe('/info/termsAndConditions');
            });

            it('ignores anything that is not a function on the specified controller', function(){

                // Parse the routes.
                var routes = router.getRoutes();

                // Iterate over those, and make sure none of them included the url '/info/notAFunction'.
                for (var i = 0; i < routes.length; i ++) {
                    expect(routes[i].path).not.toBe('/info/notAFunction');
                }
            });

            it('throws an exception if the controller for a wildcard binding does not exist', function(){

                // Create a customised router.
                router = new Hecate({
                    routesFile: 'test/helpers/broken_configs/missing_wildcard_controller.conf'
                });

                // Parse.
                expect(function(){
                    router.getRoutes();
                }).toThrow(new Error('The specified controller (app/controllers/nothing) does not exist.'));
            });
        });
    });

    describe('when binding routes against an app', function(){

        var app;

        beforeEach(function(){

            // Mock an Express app.
            app = {
                get: function(){},
                post: function(){},
                use: function(){},
                locals: {}
            };
        });

        it('loads the routes', function(){

            // Create a spy.
            spy = sinon.spy(router, 'getRoutes');

            // Call the method.
            router.bindRoutes(app);

            // Verify.
            expect(spy.calledOnce).toBe(true);
        });

        it('makes the Hecate instance available to templates via app.locals', function(){

            // Bind the routes.
            router.bindRoutes(app);

            // There should now be a Hecate instance as app.locals.Hecate.
            expect(app.locals.Hecate).not.toBeUndefined();
        });

        describe('when handling normal binding', function(){

            it('binds those routes against the provided app', function(){

                // Create a spy on the desired method.
                spy = sinon.spy(app, 'get');

                // Bind the routes.
                router.bindRoutes(app);

                // The spy should be called 5 times.
                expect(spy.callCount).toBeGreaterThan(0);

                // Grab the last one.
                var call = spy.getCall(3);

                // Make sure the URL pattern is what we expect.
                expect(call.args[0]).toBe('/demos');
                // And a function was passed.
                expect(typeof call.args[1]).toBe('function');
            });

            it('copes with different HTTP verbs', function(){

                // Create a spy.
                spy = sinon.spy(app, 'post');

                // Bind the routes.
                router.bindRoutes(app);

                // The spy should have been called once.
                expect(spy.calledOnce).toBe(true);
                expect(spy.getCall(0).args[0]).toBe('/users/login');
            });

           it('supports paths when referencing controllers', function(){

               // Create a spy.
               spy = sinon.spy(app, 'get');

               // Bind the routes.
               router.bindRoutes(app);

               // Grab the 6th call (to the event.show combination), and make sure the function was loaded.
               var call = spy.getCall(5);
               expect(call.args[0]).toBe('/calendar/:id');
               expect(typeof call.args[1]).toBe('function');
            });

            it('throws an exception if the specified controller does not exist', function(){

                // Create a customised router.
                router = new Hecate({
                    routesFile: 'test/helpers/broken_configs/missing_controller.conf'
                });

                // Bind the routes.
                expect(function(){
                    router.bindRoutes(app);
                }).toThrow(new Error('The specified controller (app/controllers/nothing) does not exist.'));
            });

            it('throws an exception if the specified method does not exist', function(){

                // Create a customised router.
                router = new Hecate({
                    controllersPath: 'test/helpers/controllers/',
                    routesFile: 'test/helpers/broken_configs/missing_method.conf'
                });

                // Bind the routes.
                expect(function(){
                    router.bindRoutes(app);
                }).toThrow(new Error('The specified method (nothing) does not exist on the controller (test/helpers/controllers/app).'));
            });
        });

        describe('when handling static directories', function(){

            it('allows binding of static directories', function(){

                // Create a spy.
                spy = sinon.spy(app, 'use');

                // Bind the routes.
                router.bindRoutes(app);

                // Verify.
                expect(spy.calledOnce).toBe(true);
                var call = spy.getCall(0);
                expect(typeof call.args[0]).toBe('function');
            });

            it('throws an exception if a static directory does not exist', function(){

                // Create a customised router.
                router = new Hecate({
                    routesFile: 'test/helpers/broken_configs/missing_static_directory.conf'
                });

                // Bind the routes.
                expect(function(){
                    router.bindRoutes(app);
                }).toThrow(new Error('The specified static path (nothing) does not exist or is not a directory.'));
            });
        });
    });

    describe('when binding parameters into URLs', function(){

        var DUMMY_URL = '/demos/:test';

        it('inserts parameters into the provided string according to the Express standard', function(){

            // Call the method.
            var url = router.bindUrl(DUMMY_URL, 'foo');

            // Verify the result.
            expect(url).toBe('/demos/foo');
        });

        it('ignores extra parameters', function(){

            // Call the method.
            var url = router.bindUrl(DUMMY_URL, ['foo', 'bar']);

            // Verify only the first one got injected.
            expect(url).toBe('/demos/foo');
        });

        it('throws an exception if insufficient parameters are passed', function(){
            expect(function(){
                router.bindUrl('/demos/:first/type/:second', 'foo');
            }).toThrow(new Error('Insufficient parameters passed. Unable to bind: :second'));
        });

        it('copes with numbers', function(){

            // Call the method.
            var url = router.bindUrl(DUMMY_URL, 5);

            // Verify.
            expect(url).toBe('/demos/5');
        });

        it('matches objects against the named regex pieces', function(){

            // Call the method. Note that we pass the object properties out of order.
            var url = router.bindUrl('/demos/:foo/bar/:bar', {
                bar: 'else',
                foo: 'something'
            });

            // Verify.
            expect(url).toBe('/demos/something/bar/else');
        });

        it("appends object attributes if they don't match a named parameter", function(){

            // Call the method.
            var url = router.bindUrl('/demos/:foo', {
                bar: 'else',
                foo: 'something'
            });

            // Verify.
            expect(url).toBe('/demos/something?bar=else');

            // Let's try something a little more complex.
            url = router.bindUrl('/demos/:foo/bar/:bar', {
                bar: 'else',
                test: 'val',
                foo: 'something'
            });

            // Verify.
            expect(url).toBe('/demos/something/bar/else?test=val');
        });

        it("appends multiple object attributes if they don't match a named parameter", function(){

            // Call the method.
            var url = router.bindUrl('/demos/:foo', {
                bar: 'else',
                foo: 'something',
                test: 'val'
            });

            // Verify.
            expect(url).toBe('/demos/something?bar=else&test=val');
        });

        it('copes with multiple objects properly', function(){

            // Call the method.
            var url = router.bindUrl('/demos/:foo/bar/:bar', [{
                bar: 'else'
            }, {
                foo: 'something'
            }]);

            // Verify.
            expect(url).toBe('/demos/something/bar/else');
        });

        it('copes with mixed data types', function(){

            // Call the method.
            var url = router.bindUrl('/demos/:foo/bar/:bar', ['something', {
                bar: 'else'
            }]);

            // Verify.
            expect(url).toBe('/demos/something/bar/else');

            // Switch the order.
            url = router.bindUrl('/demos/:foo/bar/:bar', [{
                bar: 'else'
            }, 'something']);

            // Verify.
            expect(url).toBe('/demos/something/bar/else');

            // Make sure it explodes if something is missed.
            var failed = false;
            try {
                url = router.bindUrl('/demos/:foo/bar/:bar', [{
                    test: 'val'
                }, 'something']);
            }
            catch(e){
                failed = true;
            }
            expect(failed).toBe(true);
        });

        it('ignores nested objects', function(){

            // Call the method.
            var url = router.bindUrl('/demos/:foo', {
                foo: 'something',
                bar: {
                    test: 'val'
                }
            });

            // Verify.
            expect(url).toBe('/demos/something');

            // Make sure that's true for named keys too.
            url = router.bindUrl('/demos/:foo', [{
                foo: {
                    bar: 'val'
                }
            }, 'test']);

            // Verify.
            expect(url).toBe('/demos/test');
        });

        it('ignores functions in passed objects', function(){

            // Call the method.
            var url = router.bindUrl('/demos/:foo', {
                foo: 'something',
                bar: function(){
                    return 'val';
                }
            });

            // Verify.
            expect(url).toBe('/demos/something');

            // Make sure that's true for named keys too.
            url = router.bindUrl('/demos/:foo', [{
                foo: function(){
                    return 'bar';
                }
            }, 'test']);

            // Verify.
            expect(url).toBe('/demos/test');
        });

        it('does not mangle original objects', function(){

            // Define an object.
            var data = {
                foo: 'test',
                bar: 'something'
            };

            // Create a URL.
            var url = router.bindUrl('/demos/:bar', data);

            // Ensure the values were injected correctly.
            expect(url).toBe('/demos/something?foo=test');

            // Ensure our object is unchanged.
            expect(data.foo).toBe('test');
            expect(data.bar).toBe('something');
        });
    });

    describe('the reverse method', function(){

        it('fetches URLs for given controller/method combos', function(){
            var url = router.reverse('app.index');
            expect(url).toBe('/');
        });

        it('accepts parameters and binds those into the URL', function(){

            // Call the method.
            var url = router.reverse('demos.index', {
                test: 'something'
            });

            // Verify.
            expect(url).toBe('/demos/something');
        });

        it('continues trying matches if binding was unsuccessful', function(){

            // Call the method.
            var url = router.reverse('demos.index');

            // We should fail on the parameterised URL and pass through to the stock one.
            expect(url).toBe('/demos');
        });

        it('throws an exception if the specified controller/method pairing does not exist', function(){
            expect(function(){
                router.reverse('something.fake');
            }).toThrow(new Error('No matching action was found.'));
        });

        it('rethrows a binding exception if a match was found but binding failed', function(){
            expect(function(){
                router.reverse('demos.required');
            }).toThrow(new Error('Insufficient parameters passed. Unable to bind: :required'));
        });
    });
});