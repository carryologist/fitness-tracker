const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the shared directory outside mobile/
const sharedDir = path.resolve(__dirname, '../shared');
config.watchFolders = [sharedDir];

// Resolve shared/ imports to the actual directory
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
