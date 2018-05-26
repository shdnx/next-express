# Nextpress - Next.js + Express.js made easy

[Next.js](https://nextjs.org) is a framework for easily creating web applications using Node.js and React. It provides a built-in solution for styling, routing, handling server-side handling, and more. With complicated websites, you often want to use it with a [custom Node.js webserver](https://nextjs.org/docs#custom-server-and-routing), often written using [Express.js](http://expressjs.com). Nextpress is a tiny library that makes this trivial.

## The problem

Next.js page components can define an asynchronous static method `getInitialProps()` that will provide the `props` to the page component. As of Next.js v6.0, `getInitialProps()` is executed once on the server for the initial page, and then executed **only** on the client for any page transitions (using Next.js' `<Link>` component). In this function, you will generally want to load information from your data sources; for instance, from a database. However, when running on the client, you do not have access to the database, nor any other data sources on the server side.

A common solution to the problem is to define a REST API, i.e. server-side route (e.g. using Express) that loads the required information and sends it back to the client encoded as JSON. Then, you can use a universal `fetch()` implementation to perform an AJAX (HTTP) request against that API (route).

This works, but involves writing some boilerplate code for performing a `fetch()` in every page that needs from the server (which is usually most of them), plus an extra server-side route. Furthermore, for the initial `getInitialProps()` call that happens on the server, you're now paying for an extra HTTP request unnecessarily.

There is a way to eliminate the extra HTTP request, as you are allowed to pass data via the query arguments object from your page-rendering route to your page component, but at the cost of additional mess to your codebase.
Nextpress allows you to solve this problem trivially, keeping your code clear and performant.

## Requirements

Nextpress declares no dependencies, but requires the following to function as intended:

 - Node.js v7.6.0 or higher (has to support async/await)
 - Next.js v5 or higher
 - Express.js v4

## Installation

Using NPM:

```bash
npm install --save nextpress
```

Using Yarn:

```bash
yarn add nextpress
```

## Using Nextpress

Using Nextpress on the server is very easy, since Nextpress integrates into Express:

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

// initialize and inject Nextpress into Express.js
const nextpress = require("nextpress/server").configure(express, app);

app.prepare()
  .then(() => {
    // like 'express()', 'nextpress()' creates an Express.js
    // application, augumented with Nextpress: all the normal
    // Express.js functions work as normal
    const server = nextpress();

    // one of the things that Nextpress adds is a method called
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
    // nextpress' listen() method returns a Promise if no callback
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
import nextpressPage from "nextpress/page";

class FrontPage extends React.Component {
  // component code here as normal, your data is in the props
  // ...
};

// nextpressPage() automatically generates a getInitialProps() for
// the page component that takes care of fetching the data as
// needed, regardless of whether it's running on the server or
// client
export default nextpressPage(FrontPage);
```

That's it!

## Documentation

### nextpress/server

TODO

### nextpress/page

#### Default export: `nextpressPage(PageComponent)`

Auguments the given page component class such that it defines a static async `getInitialProps()` function that automatically fetches the data from the corresponding route on the server defined by `nextpress.pageRoute()` as necessary.

**Parameters**:
 - `PageComponent`: the page component class that requires data from the server.

**Return value**: the `PageComponent` parameter itself.

**Details**:

This function acts as a replacement for defining your own `getInitialProps()` on your page component class. You should not use this function if your page does not require data from the server.

You **are** allowed to define a custom `getInitialProps()` on your page component class even when using this function. If you do, all that Nextpress will do is call your custom `getInitialProps()`, passing it all normal arguments, and an extra function argument called `serverDataFetchFunc()`. This gives you full control of how and went you want server data fetching to happen. For example, you might only want to pull data from the server if you don't already have it in some local cache:

```javascript
import React from "react";
import nextpressPage from "nextpress/page";

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

export default nextpressPage(MyPage);
```

`serverDataFetchFunc()` is an async function that takes no parameters, and returns (a Promise of) the server data acquired by querying the route on the server defined with `nextpress.pageRoute()` corresponding to the current page. You cannot use this function if you didn't use `nextpress.pageRoute()` on the server side to define the route that serves this page.

When running on the server, `serverDataFetchFunc()` will not perform an HTTP request, and will be essentially a free operation in terms of performance.
When running on the client, it will send an HTTP `GET` request to the page's URL, including any query arguments. It will set only one extra header: `Accept: application/json`. This request will be handled by `nextpress.pageRoute()` route on the server: the server data will be serialized to JSON and passed to the client.

If you do not define your own `getInitialProps()`, `nextpressPage()` will define it for you, which will automatically call `serverDataFetchFunc()`.
