# Express Hecate

[![Build Status](https://secure.travis-ci.org/PascalZajac/express-hecate.png)](http://travis-ci.org/PascalZajac/express-hecate)

A convenience module for configuring and reversing routes in Express, like those in
[Play!](http://www.playframework.org/)

## Table of Contents
* [Features](#features)
* [The Routes file](#the-routes-file)
* [Reversing](#reversing)
* [Usage](#usage)
* [Changelog](#changelog)

## Features
* Support for basic URL => controller + method mappings
* Support for static directory mapping
* Support for wildcard routing
* Reversing, aka the ability to ask for the URL representing a given controller/method combination, optionally passing
variables to be injected

## The Routes file

### Basic Mappings
The Routes file is the central feature of Hecate. It allows you to easily setup relationships between URL patterns and
controller + method combinations.

The simplest example would be:

    GET     /                       app.index

Hecate parses the Routes file and creates appropriate mappings against your Express app instance.

A URL pattern is anything that would be valid in a regular Express `app.verb(url, fn)`
call. A controller + method combination is a string representing the path to the controller, and the method within it
to execute, in the format `path/to/controller.method`.

A more detailed example:

    GET     /                       app.index
    GET     /about                  info.about
    GET     /post/:id               posts.show
    GET     /calendar/:id           calendar/event.show

### Static Directories
You can add a mapping to a static directory using the `staticDir:` directive. The format is like so:

    GET     /                       staticDir:public

This is essentially the same as writing `app.use(express.static(__dirname + '/public'));`. The advantage is you didn't
actually have to specify this outside the Routes file. Because of the way Express handles static folders, the verb and
the path are technically unnecessary, but are required in the routes file just for convenience and consistency.

### Wildcard Routing
Hecate supports wildcard routing for controllers with a predictable URL schema. Wildcards are an easy way to expose all
the methods of a given controller via a particular base URL. The format is:

    GET     /info/{method}          info.{method}

This declaration in your Routes file will create routes for each function exposed on the `info` controller. So if `info`
has two methods, say, `about` and `faqs`, it will create two route bindings, one each to `/info/about` and `/info/faqs`,
with the corresponding methods configured to respond to them.

## Reversing
One of the most useful features of Hecate is the `reverse()` method. This allows you to ask for the URL representing a
given controller + method combination, optionally including parameters which will be injected into the URL. Using the
above sample Routes file:

```js
Hecate.reverse('app.index');        // = '/'
Hecate.reverse('posts.show', 5);    // = '/posts/5'
Hecate.reverse('calendar/event.show', {
    id: 4
});                                 // = '/calendar/4'
Hecate.reverse('posts.show', {
    id: 5,
    sort: 'desc'
});                                 // = '/posts/5?sort=desc'
```

Parameter binding supports named variables, object hashes, multiple arguments - pretty much every combination you could
want to generate a URL. The order you supply arguments determines the order they are bound: first named variables will
be filled, and then any leftover will be appended as `key=value` pairs. When using object hashes, named variables will
be matched against the named field in the hash. If a named parameter is not supplied to the call, an exception is
generated.

When you bind your routes against your Express app, Hecate is automatically made available via the `app.locals` object,
using the name supplied for the `templateVar`option (default: 'Hecate'). You can then access this from other places
within your app, or in your templates.

## Usage

```js
var Hecate = require('express-hecate');
var app = express();
var hecate = new Hecate(options);
hecate.bindRoutes(app);
```

### Options

#### controllersPath
##### Default: app/controllers/
The root folder in which all controllers live (saves you having to specify complete paths continuously in the
Routes file).

#### routesFile
##### Default: config/routes.conf
The path to the Routes file that should be parsed.

#### templateVar
##### Default: Hecate
Hecate is automatically made available to all views throughout an Express app by way of the `app.locals` object. The
`templateVar` config option controls the name of the variable used on the `app.locals` object to store the Hecate
instance.

## Why?
My goal was to make configuring route => controller mappings in Express a less verbose experience. The amount of
boilerplate required to map more than a handful of URLs to controllers seemed extravagant, so I wanted
something that would do the majority of the work for me. Having come from a project built on the Play! framework, I
found the way routes are defined in that quite pleasant and useful, so I decided to use that as my model.


## Demonstration
See: [https://github.com/PascalZajac/hecate-demo](https://github.com/PascalZajac/hecate-demo) for a sample application
that demonstrates how to integrate Hecate in your Express application. It also features a slightly more thorough
explanation of the core principles.

## Changelog
* 0.5.0 - Adding support for wildcard routing.
* 0.4.0 - Adding support for static directories, extensively improved error handling, rewrote documentation.
* 0.3.4 - Documentation cleanup, fixing lint issues, reformatting, added changelog.
* 0.3.3 - Vastly expanded support for objects and named variable references in `reverse` method.
* 0.2.4 - Initial NPM release, basic binding support.

## ...Why Hecate?
Hecate is [variously associated with crossroads, entrance-ways](http://en.wikipedia.org/wiki/Hecate). I wanted a name
that was sufficiently unique (the plugin space already being fairly crowded) and hopefully memorable, so I started
thinking abstractly about routes and travelling and from there to the gods associated with such endeavours. Also,
Hecate has some personal significance, and I'm a sentimentalist at heart.