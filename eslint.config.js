const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([expoConfig, { ignores: ['my docs/**', 'config/**', 'dist/**', 'android/**', 'ios/**'] }]);
