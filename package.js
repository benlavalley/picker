Package.describe({
  name: 'meteorhacks:picker',
  summary: 'Server Side Router for Meteor',
  version: '1.0.7',
  git: 'https://github.com/meteorhacks/picker.git'
});

Npm.depends({
  'path-to-regexp': '5.0.0',
  'url':'0.11.0'
});

Package.onUse(function(api) {
  configurePackage(api);
  api.export(['Picker']);
});

Package.onTest(function(api) {
  configurePackage(api);
  api.use(['tinytest', 'http', 'random'], ['server']);
  api.addFiles([
    'test/instance.js'
  ], ['server']);
});

function configurePackage(api) {
  if(api.versionsFrom) {
    api.versionsFrom('METEOR@1.8.1');
  }

  api.use(['webapp', 'underscore', 'ecmascript'], ['server']);
  api.addFiles([
    'lib/implementation.js',
  ], ['server']);
  api.mainModule('lib/instance.js','server');
}
