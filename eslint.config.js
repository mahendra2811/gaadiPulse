const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
 expoConfig,
 { settings: { 'import/ignore': ['node_modules/react-native/index.js', 'node_modules/@electric-sql/pglite/'] } },
 { ignores: ['my docs/**', 'config/**', 'dist/**', 'android/**', 'ios/**'] },
]);
