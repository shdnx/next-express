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

const nextExpress = require("../../server")(app);
//const nextExpress = require("next-express/server")(app);

// Makes the next-express functionality available through this express object.
nextExpress.injectInto(express);

app.prepare()
  .then(() => {
    const server = express();

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

    // Even without using nextExpress.injectInto(), the above is also equivalent to:
    /*server.get("/", nextExpress.getPageHandler({
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

    // next-express' listen() method returns a Promise if no callback function was passed to it
    return server.listen(PORT);
  })
  .then(() => console.log(`> Running on http://localhost:${PORT}`))
  .catch(err => {
    console.error(`Server failed to start: ${err.stack}`);
    process.exit(1);
  });
