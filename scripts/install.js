#!/usr/bin/env node

var Path = require('path')
  , Optionall = require('optionall')
  , FS = require('fs')
  , Async = require('async')
  , _ = require('underscore')
  , Belt = require('jsbelt')
  , Util = require('util')
  , Winston = require('winston')
  , Events = require('events')
  , Spinner = require('its-thinking')
  , CP = require('child_process')
  , Request = require('request')
;

var O = new Optionall({
                       '__dirname': process.env.rootdir || process.cwd()
                     , 'file_priority': [
                         'package.json'
                       , 'environment.json'
                       , 'credentials.json'
                       , 'config.json'
                       ]
                     });

var Log = new Winston.Logger();
Log.add(Winston.transports.Console, {'level': 'debug', 'colorize': true, 'timestamp': false});

var Spin = new Spinner(4);

var GB = _.defaults(O.argv, {
  'server_path': Path.join(O.__dirname, '/node_modules/basecmd/lib/server.js')
, 'daemon_path': Path.join(O.__dirname, '/node_modules/basecmd/scripts/daemon.js')
, 'views_path': Path.join(O.__dirname, '/node_modules/basecmd/lib/views/*')
, 'scripts_path': Path.join(O.__dirname, '/node_modules/basecmd/scripts/*')
});

Spin.start();

Async.waterfall([
  function(cb){
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './lib/models/helpers') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './lib/controllers/helpers') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './lib/helpers') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './lib/views') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './resources/assets') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './resources/config') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './scripts') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './public/js/views') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './public/css') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './public/fonts') + '"');
    CP.execSync('mkdir -p "' + Path.join(O.__dirname, './public/assets') + '"');

    CP.execSync('cp -Rf ' + GB.views_path + ' "' + Path.join(O.__dirname, './lib/views') + '"');
    CP.execSync('cp -Rf "' + GB.server_path + '" "' + Path.join(O.__dirname, './lib/server.js') + '"');
    CP.execSync('cp -Rf ' + GB.scripts_path + ' "' + Path.join(O.__dirname, './scripts') + '"');

/*
    CP.execSync('ln -sf "' + GB.server_path + '" "' + Path.join(O.__dirname, './lib/server.js') + '"');
    CP.execSync('ln -sf "' + GB.daemon_path + '" "' + Path.join(O.__dirname, './scripts/daemon.js') + '"');
    CP.execSync('ln -sf ' + GB.scripts_path + ' "' + Path.join(O.__dirname, './scripts') + '"');
*/

    return cb();
  }
], function(err){
  Spin.stop();
  if (err) Log.error(err);
  return process.exit(err ? 1 : 0);
});
