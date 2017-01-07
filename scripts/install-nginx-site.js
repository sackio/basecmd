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
  'template_path': Path.join(O.__dirname, '/resources/assets/nginx.conf.template')
, 'config_path': Path.join(O.__dirname, '/resources/config/nginx.' + O.environment + '.conf')
, 'nginx_path': '/etc/nginx/sites-enabled/' + O.domain
, 'install_nginx_conf': true
});

GB = _.defaults(O.argv, {
  'template': _.template(FS.readFileSync(GB.template_path).toString('utf8'))
});

Spin.start();

Async.waterfall([
  function(cb){
    FS.writeFileSync(GB.config_path, GB.template(O));
    if (GB.install_nginx_conf) CP.execSync('sudo ln -sf "' + GB.config_path + '" "' + GB.nginx_path + '"');
    return cb();
  }
], function(err){
  Spin.stop();
  if (err) Log.error(err);
  return process.exit(err ? 1 : 0);
});
