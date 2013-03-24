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
            controllersPath: 'test/helpers/',
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

            // There should be 6.
            expect(routes.length).toBe(6);

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

        it('generates warnings for unrecognised HTTP verbs', function(){

            // Create a customised router.
            router = new Hecate({
                routesFile: 'test/helpers/broken.conf'
            });

            // Parse.
            expect(function(){
                router.getRoutes();
            }).toThrow(new Error('Unrecognised HTTP verb for route: /test'));
        });
    });

    describe('when binding routes against an app', function(){

        var app;

        beforeEach(function(){

            // Mock an Express app.
            app = {
                get: function(){},
                post: function(){},
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

        it('binds those routes against the provided app', function(){

            // Create a spy on the desired method.
            spy = sinon.spy(app, 'get');

            // Bind the routes.
            router.bindRoutes(app);

            // The spy should be called 5 times.
            expect(spy.callCount).toBe(5);

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

        it('makes the Hecate instance available to templates via app.locals', function(){

            // Bind the routes.
            router.bindRoutes(app);

            // There should now be a Hecate instance as app.locals.Hecate.
            expect(app.locals.Hecate).not.toBeUndefined();
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