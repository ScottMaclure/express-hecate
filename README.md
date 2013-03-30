# Express Hecate

[![Build Status](https://secure.travis-ci.org/PascalZajac/express-hecate.png)](http://travis-ci.org/PascalZajac/express-hecate)

A convenience module for configuring and reversing routes in Express, like those in
[Play!](http://www.playframework.org/)

## Usage

    var app = express();
    var Hecate = require('express-hecate');
    var hecate = new Hecate({
        controllersPath: 'app/controllers/',
        routesFile: 'config/routes.conf',
        templateVar: 'Hecate'
    });
    hecate.bindRoutes(app);

### Options

#### controllersPath
##### Default: app/controllers/
The root folder in which all controllers live (saves you having to specify complete paths continuously in the
routes.conf file).

#### routesFile
##### Default: config/routes.conf
The path to the routes file that should be parsed.

#### templateVar
##### Default: Hecate
Hecate is automatically made available to all views throughout an Express app by way of the `app.locals` object. The
`templateVar` config option controls the name of the variable used on the `app.locals` object to store the Hecate
instance.

## Why?

My goal was to make configuring route => controller mappings in Express easier when dealing with 'static' routes. The
amount of boilerplate required to map more than a handful of URLs to controllers seemed extravagant, so I wanted
something that would do the majority of the work for me. Having come from a project built on the Play! framework, I
found the way routes are defined in that quite pleasant and useful, so I decided to use that as my model.

Obviously there are going to be scenarios where this approach isn't perfect, but this module does not interfere with
regular Express route definition or other routing-related modules (such as resourceful routing) in any way, so feel
free to mix and match. If you've got an app that needs resourceful routing for CRUD, this might be a useful
complementary module for the boring static pages that are otherwise hard to fit into a dynamic app's URL schema.

## How does it work?

Basically you supply a configuration file mapping HTTP verbs, URL paths and controller methods to handle them.

    # A sample routes file.
    GET     /                       app.index
    GET     /faqs                   app.faqs
    GET     /demos                  demos.index
    GET     /demos/:test            demos.index

Hecate parses this file and will create the appropriate mappings against your Express app instance.

That's not all though, as Hecate also provides a `reverse()` method for resolving URLs. This decouples your views from
your URL structures - you just make a call to Hecate.reverse, passing in the controller and method pairing you want
resolved, and any parameters you want bound into the generated URL.

#### In Jade
    a(href=Hecate.reverse('app.faqs')) FAQs
    a(href=Hecate.reverse('demos.index', 'foo') Foo

#### Resulting HTML
    <a href="/faqs">FAQs</a>
    <a href="/demos/foo>Foo</a>

## Demonstration
See: [https://github.com/PascalZajac/hecate-demo](https://github.com/PascalZajac/hecate-demo) for a sample application
that demonstrates how to integrate Hecate in your Express application. It also features a slightly more thorough
explanation of the core principles.

## Changelog
* 0.4.0 - Adding support for static directories, extensively improved error handling.
* 0.3.4 - Documentation cleanup, fixing lint issues, reformatting, added changelog.
* 0.3.3 - Vastly expanded support for objects and named variable references in `reverse` method.
* 0.2.4 - Initial NPM release, basic binding support.

## ...Why Hecate?

Hecate is [variously associated with crossroads, entrance-ways](http://en.wikipedia.org/wiki/Hecate). I wanted a name
that was sufficiently unique (the plugin space already being fairly crowded) and hopefully memorable, so I started
thinking abstractly about routes and travelling and from there to the gods associated with such endeavours. Also,
Hecate has some personal significance, and I'm a sentimentalist at heart.