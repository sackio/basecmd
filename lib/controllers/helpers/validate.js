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
  , CP = require('child_process')
  , OS = require('os')
;

module.exports = function(S, O){
  O = _.defaults(O || {}, {

  });

  S['required'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //required
      //data
    });

    return Async.waterfall([
      function(cb){
        var missing = _.find(a.o.required, function(r){
          return Belt.isNull(Belt.get(a.o.data, r));
        });

        if (missing) return cb(new Error(r + ' is required'));

        return cb();
      }
    ], function(err){
      return a.cb(err);
    });
  };

  S['cast'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //cast
      //data
    });

    return Async.waterfall([
      function(cb){
        _.each(cast, function(v, k){
          a.o.data = Belt.deepCast(a.o.data, k, v);
        });

        return cb();
      }
    ], function(err){
      return a.cb(err, a.o.data);
    });
  };

  return S;
};
