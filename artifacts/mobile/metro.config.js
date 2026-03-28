const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.blockList = [
  /.*_tmp_\d+.*/,
  /node_modules\/@firebase\/.*_tmp.*/,
];

module.exports = config;
