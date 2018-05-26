const { promisify } = require("util");

// Based on: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
// NOTE: seems like that this requires a specific Babel transform for this to work when being transpiled; see the above link for details
class InvalidRequestError extends global.Error {
  constructor(message, statusCode, ...errorArgs) {
    super(message, ...errorArgs);

    this.statusCode = statusCode || 400;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidRequestError);
    }
  }
};

module.exports = function createNextpress(nextApp) {
  let g_orgListen = null;
  let g_orgListenAsync = null;

  const nextExpress = {
    InvalidRequestError,

    getPageHandler(options) {
      let getProps, renderPath;
      if (typeof options === "function") {
        getProps = options;
        renderPath = null;
      } else {
        // the extra parantheses are required, because otherwise the curly brackets gets parsed as beginning a block scope
        ({ getProps = null, renderPath = null } = options);
      }

      return async (req, res) => {
        let data;

        if (getProps) {
          try {
            data = await getProps(req, res);
            data.requestSuccess = true;
          } catch (error) {
            // TODO: we should allow library users to provide error handlers: one for InvalidRequestError-s, the other for all other Error-s

            if (error instanceof InvalidRequestError) {
              console.error(`InvalidRequestError on ${req.url}: ${error.stack}`);

              res.status(error.statusCode);

              // InvalidRequestError-s are supposed to act as user-facing errors, so replying to the client with the error message is fine.
              if (req.accepts([ "text", "html" ])) {
                res.type("text").send(`Failed to process request: ${error.message}`);
              } else if (req.accepts("json")) {
                res.type("json").send(JSON.stringify({
                  requestSuccess: false,
                  errorMessage: error.message
                }));
              } else {
                res.end();
              }

              return;
            }

            res.status(500).send("Server error");
            throw error; // re-throw
          } // end catch
        }

        if (req.accepts("html")) {
          if (!renderPath)
            renderPath = req.baseUrl + req.path;

          // pass the data in via the query, but make sure not to overwrite the query arguments, otherwise they get lost
          const query = req.query;
          query._nextExpressData = data;

          nextApp.render(req, res, renderPath, query);
        } else if (req.accepts("json") && data) {
          res.type("json").send(JSON.stringify(data));
        } else {
          // HTTP 406: Not Acceptable
          res.status(406).end();
        }
      };
    }, // end getPageHandler()

    pageRoute(expressRouter, {
      path,
      middleware = [],
      ...handlerOptions
    }) {
      const handler = this.getPageHandler(handlerOptions);
      return expressRouter.get(path, ...middleware, handler);
    },

    // Hijack listen(), because we need to register the request handler of Next.js here, after all routes have presumably been registered.
    // Also provide Promise support while we're at it.
    listen(expressApp, ...listenArgs) {
      if (!expressApp._isNextHandlerRegistered) {
        expressApp.get("*", nextApp.getRequestHandler());
        expressApp._isNextHandlerRegistered = true;
      }

      const listenFunc = g_orgListen || expressApp.listen;

      if (listenArgs.length === 0 || typeof listenArgs[listenArgs.length - 1] !== "function") {
        // return a Promise if and only if no callback parameter was specified
        if (!g_orgListenAsync) {
          g_orgListenAsync = promisify(listenFunc);
        }

        return g_orgListenAsync.apply(expressApp, listenArgs);
      }

      return listenFunc.apply(expressApp, listenArgs);
    }, // end listen()

    injectInto(express) {
      const extensions = {
        getPageHandler(options) {
          return nextExpress.getPageHandler(options);
        },

        pageRoute(options) {
          return nextExpress.pageRoute(this, options);
        }
      };

      Object.assign(express.Router, extensions);
      Object.assign(express.application, extensions);

      g_orgListen = express.application.listen;

      // cannot use an array function here, since we need the 'this' it gets called with
      express.application.listen = function nextExpressListen(...args) {
        return nextExpress.listen(this, ...args);
      };

      return express;
    } // end injectInto()
  }; // end nextExpress object

  return nextExpress;
};
