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
  , Request = require('request')
  , Moment = require('moment-timezone')
;

module.exports = function(S, O){

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
