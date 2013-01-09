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
;

module.exports = function(schema, options, callback){
  var M = schema
    , CB = callback || (_.isFunction(options) ? options : Belt.np)
    , O = options || {};

  M['static']('join', function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //path
      //docs
      //model
      'join_path': '_id'
    , 'concurrency': 15
    , 'virtual_path': '__' + a.o.model + '_docs'
    });

    var gb = {};
    return Async.waterfall([
      function(cb){
        return Async.eachLimit(a.o.docs, a.o.concurrency, function(d, cb2){
          return M.Instance.db.model(a.o.model).find(_.object([
            a.o.path
          ], [
            d.get(a.o.join_path)
          ]), function(err, docs){
            d[a.o.virtual_path] = docs;
            return cb2(err);
          });
        }, Belt.cw(cb, 0));
      }
    ], function(err){
      return a.cb(err, a.o.docs);
    });
  });

  M.method('join', function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      'docs': [self]
    });
    return self.constructor.join(a.o, Belt.cw(a.cb, 0));
  });

};
