const path = require("path");

module.exports = {
  distDir: "build",

  webpack(config, options) {
    Object.assign(config.resolve.alias, {
      // Note: for some reason this doesn't work unless it points directly to the "lib" directory - i.e. pointing to the root folder causes Babel to fail with syntax error on the "export" statement. Wtf?
      // Same happens if in package.json I declare the dependency to nextpress as file:../ (local dependency)...
      nextpress: path.resolve(__dirname, "..", "..", "lib")
    });

    return config;
  }
};