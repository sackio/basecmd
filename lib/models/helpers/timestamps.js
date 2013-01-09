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

  M.add({
    'updated_at': {type: Date}
  , 'created_at': {type: Date}
  });

  M.pre('save', function(next){
    if (this.isNew) this.set({
      'created_at': new Date()
    });

    if (this.isModified) this.set({
      'updated_at': new Date()
    });

    return next();
  });

};
