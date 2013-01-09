#!/usr/bin/env node

var Path = require('path')
  , Optionall = require('optionall')
  , FSTK = require('fs')
  , Async = require('async')
  , _ = require('underscore')
  , Belt = require('jsbelt')
  , Util = require('util')
  , Winston = require('winston')
  , Events = require('events')
  , Request = require('request')
  , Nodemailer = require('nodemailer')
  , SES = require('nodemailer-ses-transport')
;

module.exports = function(O){
  var Opts = O || new Optionall({
                                  '__dirname': Path.resolve(module.filename + '/../..')
                                , 'file_priority': ['package.json', 'environment.json', 'config.json']
                                });

  var S = new (Events.EventEmitter.bind({}))();
  S.settings = Belt.extend({
    'log_level': 'debug'
  // server
  }, Opts);

  S.server = S.settings.instance.express;
  S.db = S.settings.instance.db;
  S.model = S.settings.model;
  S.instance = S.settings.instance;
  S.name = S.settings.name;

  var log = S.instance.log || new Winston.Logger();
  if (!S.instance.log) log.add(Winston.transports.Console, {'level': S.settings.log_level, 'colorize': true, 'timestamp': false});

///////////////////////////////////////////////////////////////////////////////////////////////////
// METHODS
///////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
////ROUTES                                                                  ////
////////////////////////////////////////////////////////////////////////////////

  S.instance.io.on('connection', function (socket){
    socket.on('/room/join', function (data){
      if (Belt.get(data, 'room')) socket.join(data.room);
    });

    socket.on('/room/leave', function (data){
      if (Belt.get(data, 'room')) socket.leave(data.room);
    });
  });

////////////////////////////////////////////////////////////////////////////////
////SETUP                                                                   ////
////////////////////////////////////////////////////////////////////////////////

  setTimeout(function(){
    var gb = {};
    return Async.waterfall([
      function(cb){
        return cb();
      }
    ], function(err){
      if (err) S.emit('error', err);
      return S.emit('ready');
    });
  }, 0);

  return S;
};
