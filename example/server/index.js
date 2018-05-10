const path = require("path");
const express = require("express");
const next = require("next");
const { readFile, writeFile } = require("fs");
const { promisify } = require("util");

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const PORT = 8000;

const app = next({
  dir: path.join(path.dirname(__dirname), "app"),
  dev: process.env.NODE_ENV !== "production"
});

const nextpress = require("../../server").configure(express, app);
//const nextpress = require("nextpress/server").configure(express, app);

app.prepare()
  .then(() => {
    const server = nextpress();

    server.pageRoute({
      path: "/",
      renderPath: "/", // redundant, since it's the same as "path"
      async getProps(req, res) {
        return {
          content: await readFileAsync(path.join(path.dirname(__dirname), "data", "frontpage.txt"), "utf-8")
        };
      }
    });

    // The above is equivalent to:
    /*server.get("/", server.getPageHandler({
      renderPath: "/",
      async getProps(req, res) {
        return {
          content: await readFileAsync(path.join(path.dirname(__dirname), "data", "frontpage.txt"), "utf-8")
        };
      }
    }));*/

    server.post("/api/save", express.json(), async (req, res) => {
      const newText = req.body.content;
      if (!newText) {
        res.status(400).end();
        return;
      }

      try {
        await writeFileAsync(
          path.join(path.dirname(__dirname), "data", "frontpage.txt"),
          newText
        );
      } catch (error) {
        console.error("Failed to save new frontpage data: ", error.stack);
        res.status(500).end();
        return;
      }

      res.end();
    });

    // nextpress' listen() method returns a Promise if no callback function was passed to it
    return server.listen(PORT);
  })
  .then(() => console.log(`> Running on http://localhost:${PORT}`))
  .catch(err => {
    console.error(`Server failed to start: ${err.stack}`);
    process.exit(1);
  });
