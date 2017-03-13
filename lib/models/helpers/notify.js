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

  M.pre('save', function(next){
    this['wasNew'] = this.isNew;
    next();
  });

  M.post('save', function(doc){
    if (this.wasNew) M.Instance.emit(O.name + ':create', doc);
    M.Instance.emit(O.name + ':save', doc);
  });

  M.post('remove', function(doc){
    M.Instance.emit(O.name + ':remove', doc);
  });
};
