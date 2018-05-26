# Next-Express.js: Next.js + Express.js made easy

[Next.js](https://nextjs.org) is a framework for easily creating web applications using Node.js and React. It provides a built-in solution for styling, routing, handling server-side handling, and more. With complicated websites, you often want to use it with a [custom Node.js webserver](https://nextjs.org/docs#custom-server-and-routing), often written using [Express.js](http://expressjs.com). Next-Express is a tiny library that makes this trivial.

(I really wanted the package name `nextpress`, but unfortunately it's already taken by an abandoned package...)

## The problem

Next.js page components can define an asynchronous static method `getInitialProps()` that will provide the `props` to the page component. As of Next.js v6.0, `getInitialProps()` is executed once on the server for the initial page, and then executed **only** on the client for any page transitions (using Next.js' `<Link>` component). In this function, you will generally want to load information from your data sources; for instance, from a database. However, when running on the client, you do not have access to the database, nor any other data sources on the server side.

A common solution to the problem is to define a REST API, i.e. server-side route (e.g. using Express) that loads the required information and sends it back to the client encoded as JSON. Then, you can use a universal `fetch()` implementation to perform an AJAX (HTTP) request against that API (route).

This works, but involves writing some boilerplate code for performing a `fetch()` in every page that needs from the server (which is usually most of them), plus an extra server-side route. Furthermore, for the initial `getInitialProps()` call that happens on the server, you're now paying for an extra HTTP request unnecessarily.

There is a way to eliminate the extra HTTP request, as you are allowed to pass data via the query arguments object from your page-rendering route to your page component, but at the cost of additional mess to your codebase.
Next-Express allows you to solve this problem trivially, keeping your code clear and performant.

## Requirements

Next-Express declares no dependencies, but requires the following to function as intended:

 - Node.js v7.6.0 or higher (has to support async/await)
 - Next.js v5 or higher
 - Express.js v4

## Installation

Using NPM:

```bash
npm install --save next-express
```

Using Yarn:

```bash
yarn add next-express
```

## Using Next-Express

Using Next-Express on the server is very easy, since Next-Express integrates into Express:

```javascript
// server-side code, see https://nextjs.org/docs#custom-server-and-routing

const path = require("path");
const express = require("express");
const next = require("next");

// for example data loading
const { readFile } = require("fs");
const { promisify } = require("util");

const PORT = 8000;

// initialize the Next.js application
const app = next({
  dev: process.env.NODE_ENV !== "production"
});

// initialize and inject Next-Express into Express.js
// 'nextExpress' will just be the same 'express': the name difference is only for clarity of intent
const nextExpress = require("next-express/server")(app).injectInto(express);

app.prepare()
  .then(() => {
    // create an Express.js application, augumented with
    // Next-Express: all the normal Express.js functions work as
    // normal
    const server = nextExpress();

    // one of the things that Next-Express adds is a method called
    // pageRoute() that you can use to define a route that serves
    // a Next.js page
    server.pageRoute({
      // GET requests to this path will be handled by this route
      path: "/",

      // path to the Next.js page to render
      // here this is redundant, since it's the same as "path"
      renderPath: "/",

      // an async function that fetches the data to be passed to
      // the page component rendered as props - this will always
      // run on the server
      async getProps(req, res) {
        return {
          content: await readFileAsync(path.join(__dirname, "data.txt"), "utf-8")
        };
      }
    });

    // you can register any other routes as you want; you can also
    // use ALL the standard Express functions such as
    // server.get(), server.post(), server.use(), etc.

    // finally, start the server
    // next-express' listen() method returns a Promise if no callback
    // function was passed to it; it also automatically registers
    // the Next.js request handler (app.getRequestHandler())
    return server.listen(PORT);
  })
  .then(() => console.log(`> Running on http://localhost:${PORT}`))
  .catch(err => {
    console.error(`Server failed to start: ${err.stack}`);
    process.exit(1);
  });
```

For the page component, the situation is even simpler:

```javascript
import React from "react";
import nextExpressPage from "next-express/page";

class FrontPage extends React.Component {
  // component code here as normal, your data is in the props
  // ...
};

// nextExpressPage() automatically generates a getInitialProps() for
// the page component that takes care of fetching the data as
// needed, regardless of whether it's running on the server or
// client
export default nextExpressPage(FrontPage);
```

That's it!

For a more detailed example, see the [included example application](https://github.com/shdnx/next-express/tree/master/example).

## Documentation

### `next-express/server`

This module exports a single function that takes the Next.js application object as parameter and returns the `nextExpress` object that exposes the following functions:

#### `injectInto(express)`

Makes the Next-Express functionality conveniently available through the given `express` object. This adds the functions [`nextExpress.pageRoute()`](#pagerouteexpressrouter-options) and [`nextExpress.getPageHandler()`](#getpagehandleroptions) to all `express.application` and `express.Router` objects, without having to explicitly pass the express object instance as argument. Furthermore, it overrides `express.application.listen` with [`nextExpress.listen()`](#listenexpressapp-listenargs).

Using this function is the most convenient way of utilizing the features of Next-Express, and is recommended. However, it might not be possible or desirable in all scenarios.

#### `getPageHandler(options)`

Creates an Express.js request handler function to handle a request to a given Next.js page.

**Parameters**:
 - `options : Object`: an object with the following properties:
    - `renderPath : String`: the path to the Next.js page to render. It will be passed directly as third argument to [`nextApp.render()`](https://nextjs.org/docs/#custom-server-and-routing). Optional: if omitted, the Express route path is used.
    - `async getProps(req : express.Request, res : express.Response) : Promise(Object)`: an async function that will be called and the resulting `Promise` awaited whenever the page's data is requested. Takes the usual `express.Request` and `express.Response` objects as parameter, like any Express.js request handler function. This function is allowed to throw (as in, reject the returned `Promise` with) a [`nextExpress.InvalidRequestError`](#invalidrequesterror).

Instead of an object, `getPageHandler()` also accepts just a function as the only argument, which will be treated as the `getProps()` function described above.

**Return value**: an Express.js route handler `Function` that can be passed to `express.Router.get()`, `express.Router.use()`, etc.

**Details**:

This is the central function of Next-Express, meant to be used in conjunction with [`nextExpressPage()`](#default-export-nextexpresspagepagecomponent) from `next-express/page`. It generates an Express.js route handler function that serves dual purposes:

1) Handles `GET` requests that accept `application/json` but not `text/html` (as expressed by the HTTP [`Accept` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)) by obtaining the page data from `options.getProps()` and sending them back to the client as JSON.

Such requests will be performed automatically by `nextExpressPage()` from `next-express/page` whenever the given page is navigated to, and its static `getInitialProps()` function is called by Next.js. The object returned by `options.getProps()` will be passed as `props` to the page component.

2) Handles `GET` requests that accept `text/html` (as expressed by the HTTP [`Accept` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept)) by loading the props by calling `options.getProps()` and then rendering the Next.js page specified by `options.renderPath`.

3) Any other requests are considered invalid and are responded to with a status code of [406 Not Acceptable](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/406).

In both valid scenarios, `options.getProps()` is allowed to throw (as in, reject the returned `Promise` with) a `nextExpress.InvalidRequestError` when the request is invalid. The client will be sent an HTTP response with the status code given to the constructor (400 Bad Request by default). The body of the response depends on the accepted content type (as specified by the `Accept` request header):
 - If the client accepts `text/plain` or `text/html`, the response body will be the error message.
 - If the client accepts `text/json`, the response body will be the JSON object of the following shape:
    - `requestSuccess = false`
    - `errorMesssage : String`: the error message
 - Otherwise, the response body will be empty.

Take care that the error message (but not the stack trace) given to `nextExpress.InvalidRequestError` will be exposed to the end user! Do not disclose any internal, or security-critical details in it.

Note that for consistency, when no `InvalidRequestError` is thrown, the object returned by `options.getProps()` is modified by adding a property `requestSuccess` with the value `true`.

#### `pageRoute(expressRouter, options)`

Registers an HTTP `GET` route with the specified express router-like object (either an `express.Router` or an `express.application`).

**Parameters**:
 - `expressRouter`: an `express.Router` or an `express.application` object.
 - `options : Object`: object with the following properties:
    - `path : String`: the path pattern on which to listen to incoming requests. Will be passed as a first argument to `expressRouter.get()`, so the same wildcard and placeholder patterns can be used.
    - `middleware : Array(Function)`: an optional array of Express middlewares to pass to `expressRouter.get()`; these middleware will be executed before the page handler itself.
    - `...handlerOptions`: any remaining properties will be directly passed on to [`nextExpress.getPageHandler()`](#getpagehandleroptions).

**Return value**: `undefined` (same as `express.Router.get()`).

This function acts as a convenience wrapper around [`getPageHandler()`](#getpagehandleroptions).

#### `listen(expressApp, ...listenArgs)`

A convenience wrapper function around `expressApp.listen()`.

**Parameters**:
 - `expressApp`: an `express.application` object.
 - `...listenArgs`: any further arguments will be directly passed along to `expressApp.listen()`.

**Return value**: `Promise` if no callback argument was specified, otherwise `undefined` (same as `express.application.listen()`).

**Details**:

This function ensures that the Next.js request handler (obtained by `nextApp.getRequestHandler()`) is registered with `expressApp`. Otherwise, it simply calls `expressApp.listen()`.

The only other difference is that this function supports `Promise`s: if no callback function is passed as the last argument, then a `Promise` is returned which resolves when the callback function would have been called. This matches the behaviour of the function generated by `util.promisify(expressApp.listen)`. For details, see the documentation of Node.js' [`util.promisify()`](https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original).

#### `InvalidRequestError`

Represents an error that can be thrown by user code inside `getPageHandler()` or `pageRoute()` to indicate that request was invalid an expose the error to the user. Inherits from [`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error).

For information on how to use this class, see [`getPageHandler()`](#getpagehandleroptions).

###### `constructor(message : String, statusCode : ?Number, ...errorArgs)`

Constructs a new `InvalidRequestError` object with the specified error message, optional HTTP status code (defaults to [400 Bad Request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400)) and any other arguments to be passed directly to the `Error` base constructor.

### `next-express/page`

#### Default export: `nextExpressPage(PageComponent)`

Auguments the given page component class such that it defines a static async `getInitialProps()` function that automatically fetches the data from the corresponding route on the server defined by `nextExpress.pageRoute()` as necessary.

**Parameters**:
 - `PageComponent`: the page component class that requires data from the server.

**Return value**: the `PageComponent` parameter itself.

**Details**:

This function acts as a replacement for defining your own `getInitialProps()` on your page component class. You should not use this function if your page does not require data from the server.

You **are** allowed to define a custom `getInitialProps()` on your page component class even when using this function. If you do, all that Next-Express will do is call your custom `getInitialProps()`, passing it all normal arguments, and an extra function argument called `serverDataFetchFunc()`. This gives you full control of how and went you want server data fetching to happen. For example, you might only want to pull data from the server if you don't already have it in some local cache:

```javascript
import React from "react";
import nextExpressPage from "next-express/page";

class MyPage extends React.Component {
  static async getInitialProps(context, serverDataFetchFunc) {
    let data;
    if (haveInLocalCache()) {
      data = retrieveFromLocalCache();
    } else {
      data = await serverDataFetchFunc();
      storeInLocalCache(data);
    }

    // ...
  }

  // ...
};

export default nextExpressPage(MyPage);
```

`serverDataFetchFunc()` is an async function that takes no parameters, and returns (a Promise of) the server data acquired by querying the route on the server defined with `nextExpress.pageRoute()` corresponding to the current page. You cannot use this function if you didn't use `nextExpress.pageRoute()` on the server side to define the route that serves this page.

When running on the server, `serverDataFetchFunc()` will not perform an HTTP request, and will be essentially a free operation in terms of performance.
When running on the client, it will send an HTTP `GET` request to the page's URL, including any query arguments. It will set only one extra header: `Accept: application/json`. This request will be handled by `nextExpress.pageRoute()` route on the server: the server data will be serialized to JSON and passed to the client.

If you do not define your own `getInitialProps()`, `nextExpressPage()` will define it for you, which will automatically call `serverDataFetchFunc()`.

## Credits and contact

Created by [Gábor Kozár](id@gaborkozar.me).

## License

BSD 3-Clause License, see [LICENSE](https://github.com/shdnx/next-express/blob/master/LICENSE). For what this means, see the overview at [tldrlegal.com](https://tldrlegal.com/license/bsd-3-clause-license-(revised)). In a nutshell: feel free to do with it whatever you please, so long as you give credit where credit is due.
