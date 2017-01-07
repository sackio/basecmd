#!/usr/bin/env node

var Forever = require('forever-monitor')
  , Path = require('path')
  , Optionall = require('optionall')
  , Belt = require('jsbelt')
  , Async = require('async')
  , _ = require('underscore')
  , OS = require('os')
  , O = new Optionall({
                       '__dirname': process.env.rootdir || process.cwd()
                     , 'file_priority': [
                         'package.json'
                       , 'assets.json'
                       , 'settings.json'
                       , 'environment.json'
                       , 'credentials.json'
                       , 'config.json'
                       ]
                     })
  , FS = require('fs')
  , Request = require('request')
  , Servers = []
;

var gb = {};
return Async.waterfall([
  function(cb){
    if (O.log_path){
      O.daemon_log = O.daemon_log || Path.join(O.log_path, '/daemon.log');
      O.stdout = O.stdout || Path.join(O.log_path, '/stdout.log');
      O.stderr = O.stderr || Path.join(O.log_path, '/stderr.log');
    }

    for (var i = 0; i < (O.max_cpus ? OS.cpus().length : 1); i++){
      Servers.push(Forever.start(Path.join(O.__dirname, O.basecmd.server), {
        'env': O.argv || {}
      , 'watch': true
      , 'watchIgnoreDotFiles': true
      , 'watchDirectory': Path.join(O.__dirname, '/lib')
      , 'watchIgnorePatterns': [
          '**/.git/**'
        , '**/data/**'
        , '**/tmp/**'
        ]
      , 'logFile': O.daemon_log
      , 'outFile': O.stdout
      , 'errFile': O.stderr
      }));
    }

    return cb();
  }
, function(cb){
    _.each(Servers, function(s){
      s.on('error', function(err){
        console.log(['ERROR: [', new Date().toString(), ']'].join(''));
        return console.log(Belt.stringify(arguments, null, 2));
      });

      s.on('start', function(){
        return console.log(['START: [', new Date().toString(), ']'].join(''));
      });

      s.on('stop', function(){
        return console.log(['STOP: [', new Date().toString(), ']'].join(''));
      });

      s.on('restart', function(){
        return console.log(['RESTART: [', new Date().toString(), ']'].join(''));
      });

      s.on('exit', function(){
        return console.log(['EXIT: [', new Date().toString(), ']'].join(''));
      });

      return;
    });
    return cb();
  }
], function(err){
  if (err){ console.error(err); process.exit(1); }
});
