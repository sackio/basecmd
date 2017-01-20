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
;

module.exports = function(S, O){

  S.instance.io.on('connection', function (socket){
    socket.on('room:join', function (data){
      if (Belt.get(data, 'room')) socket.join(data.room);
    });

    socket.on('room:leave', function (data){
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
