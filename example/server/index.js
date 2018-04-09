const path = require("path");
const express = require("express");
const next = require("next");
const { readFile, writeFile } = require("fs");
const { promisify } = require("util");

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const PORT = 8000;

const app = next({
  dir: path.join(path.dirname(__dirname), "src"),
  dev: process.env.NODE_ENV !== "production"
});

require("../../src/server").configure(express, app);

app.prepare()
  .then(() => {
    const server = express();

    server.pageRoute({
      path: "/",
      renderPath: "/frontpage",
      async getProps(req, res) {
        return {
          content: await readFileAsync(path.join(path.dirname(__dirname), "data", "frontpage.txt"), "utf-8")
        };
      }
    });

    // The above is equivalent to:
    /*server.get("/", server.getPageHandler({
      renderPath: "/frontpage",
      async getProps(req, res) {
        return {
          content: await readFileAsync(path.join(path.dirname(__dirname), "data", "frontpage.txt"), "utf-8")
        };
      }
    }));*/

    // nextpress' listen() method returns a Promise if no callback function was passed to it
    return server.listen(PORT);
  })
  .then(() => console.log(`> Running on http://localhost:${PORT}`))
  .catch(err => {
    console.error(`Next.js server failed to start: ${err.stack}`);
    process.exit(1);
  });
