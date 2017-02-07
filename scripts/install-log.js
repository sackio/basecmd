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
  'log_path': Path.join('/var/log/', O.__dirname.split('/').pop())
, 'user': 'ubuntu'
});

Spin.start();

Async.waterfall([
  function(cb){
    CP.execSync('sudo mkdir -p "' + GB.log_path + '"');
    CP.execSync('sudo chown -R ' + GB.user + ' "' + GB.log_path + '"');
    CP.execSync('touch "' + GB.log_path + '/stdout.log"');
    CP.execSync('touch "' + GB.log_path + '/stderr.log"');
    CP.execSync('touch "' + GB.log_path + '/daemon.log"');
    return cb();
  }
], function(err){
  Spin.stop();
  if (err) Log.error(err);
  return process.exit(err ? 1 : 0);
});
