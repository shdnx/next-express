const path = require("path");

module.exports = {
  distDir: "build",

  webpack(config, options) {
    Object.assign(config.resolve.alias, {
      nextpress: path.resolve(__dirname, "..", "..", "src")
    });

    return config;
  }
};