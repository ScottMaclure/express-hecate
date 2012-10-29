# Express Hecate

[![Build Status](https://secure.travis-ci.org/PascalZajac/express-hecate.png)](http://travis-ci.org/PascalZajac/express-hecate)

A convenience module for configuring and reversing routes in Express, like those in [Play!](http://www.playframework.org/)

## Why?

My goal was to make configuring route => controller mappings in Express easier when dealing with 'static' routes. The amount of boilerplate required to map more than a handful of URLs to controllers seemed extravagant, so I wanted something that would do the majority of the work for me. Having come from a project built on the Play! framework, I found the way routes are defined in that quite pleasant and useful, so I decided to use that as my model.

Obviously there are going to be scenarios where this approach isn't perfect, but this module does not interfere with regular Express route definition or other routing-related modules (such as resourceful routing) in any way, so feel free to mix and match. If you've got an app that needs resourceful routing for CRUD, this might be a useful complementary module for the boring static pages that are otherwise hard to fit into a dynamic app's URL schema.

## How does it work?

Basically you supply a configuration file mapping HTTP verbs, URL paths and controller methods to handle them.

    # A sample routes file.
    GET     /                       app.index
    GET     /faqs                   app.faqs
    GET     /demos                  demos.index
    GET     /demos/:test            demos.index

Hecate parses this file and will create the appropriate mappings against your Express app instance.

That's not all though, as Hecate also provides a `reverse()` method for resolving URLs. This decouples your views from your URL structures - you just make a call to Hecate.reverse, passing in the controller and method pairing you want resolved, and any parameters you want bound into the generated URL.

#### In Jade
    a(href=Hecate.reverse('app.faqs')) FAQs
    a(href=Hecate.reverse('demos.index', 'foo') Foo

#### Resulting HTML
    <a href="/faqs">FAQs</a>
    <a href="/demos/foo>Foo</a>