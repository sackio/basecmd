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

module.exports = function(S){

  S['list'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //populate
    });

    var limit = Belt.cast(Belt.get(a.o, 'limit') || 500, 'number')
      , skip = Belt.cast(Belt.get(a.o, 'skip') || 0, 'number')
      , query = Belt.cast(Belt.get(a.o, 'query') || {}, 'object')
      , qry = S.model.find(query).limit(limit).skip(skip);

    if (a.o.populate) qry.populate(a.o.populate);
    if (a.o.sort) qry.sort(a.o.sort);

    .exec(a.cb);
  };

  S['listAll'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      'max': Infinity
      //progress_cb
    });

    gb['skip'] = a.o.skip || 0;
    gb['results'] = [];

    return Async.doWhilst(function(next){
      return self.list(_.extend({}, _.omit(a.o, ['max']), {'skip': gb.skip})
      , function(err, res){
        if (err) return next(err);

        gb['lresults'] = res || [];
        gb.skip += gb.lresults.length;
        gb.results = gb.results.concat(gb.lresults);

        if (a.o.progress_cb){
          return Async.eachLimit(gb.lresults || [], 10, function(e, cb2){
            return a.o.progress_cb(e, Belt.cw(cb2, 0));
          }, Belt.cw(next, 0));
        }

        return next();
      });
    }, function(){ return a.o.max >= gb.skip && _.any(gb.lresults); }, function(err){
      return a.cb(err, gb.results);
    });
  };

  S['create'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //required
      //data
      //pre
      //post
      //populate
    });

    return Async.waterfall([
      function(cb){
        var missing = _.find(a.o.required, function(q){
          return Belt.isNull(a.o.data[q]);
        });

        if (missing) return cb(new Error(missing + ' is required'));

        if (!a.o.pre) return cb();

        return a.o.pre(a.o, Belt.cs(cb, a, 'o', 1, 0));
      }
    , function(cb){
        return S.model.create(a.o.data, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        if (!a.o.populate) return cb();

        return gb.doc.populate(a.o.populate, Belt.cw(cb, 0));
      }
    , function(cb){
        if (!a.o.post) return cb();

        return a.o.post(gb.doc, a.o, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    ], function(err){
      return a.cb(err, gb.doc);
    });
  });

  S['read'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {

    });

    return Async.waterfall([
      function(cb){
        if (!a.o.pre) return cb();

        return a.o.pre(a.o, Belt.cs(cb, a, 'o', 1, 0));
      }
    , function(cb){
        return S.model.findOne(a.o.query, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        if (!gb.doc) return cb(new Error('Not found'));

        if (!a.o.populate) return cb();

        return gb.doc.populate(a.o.populate, Belt.cw(cb, 0));
      }
    , function(cb){
        if (!a.o.post) return cb();

        return a.o.post(gb.doc, a.o, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    ], function(err){
      return a.cb(err, gb.doc);
    });
  };

  S['update'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      'save_method': 'save'
    });

    return Async.waterfall([
      function(cb){
        if (!a.o.pre) return cb();

        return a.o.pre(a.o, Belt.cs(cb, a, 'o', 1, 0));
      }
    , function(cb){
        return S.model.findOne(a.o.query, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        if (!gb.doc) return cb(new Error('Not found'));

        if (!a.o.populate) return cb();

        return gb.doc.populate(a.o.populate, Belt.cw(cb, 0));
      }
    , function(cb){
        _.each(a.o.$set, function(v, k){
          gb.doc.set(k, v);
        });
        gb.doc.set(_.object(a.o.$unset || []
        , _.map(a.o.$unset || [], function(u){ return undefined; })));

        _.each(a.o.$push, function(v, k){
          v = Belt.toArray(v);
          _.each(v, function(v2){
            gb.doc.get(k).push(v2);
          });
        });

        _.each(a.o.$pull, function(v, k){
          v = Belt.toArray(v);
          _.each(v, function(v2){
            gb.doc.get(k).pull(v2);
          });
        });

        return cb();
      }
    , function(cb){
        if (!a.o.post) return cb();

        return a.o.post(gb.doc, a.o, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    , function(cb){
        return gb.doc[a.o.save_method](Belt.cs(cb, gb, 'doc', 1, 0));
      }
    ], function(err){
      return a.cb(err, gb.doc);
    });
  };

  S['delete'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {

    });

    return Async.waterfall([
      function(cb){
        if (!a.o.pre) return cb();

        return a.o.pre(a.o, Belt.cs(cb, a, 'o', 1, 0));
      }
    , function(cb){
        return S.model.remove(a.o.query, Belt.cw(cb, 0));
      }
    ], function(err){
      return a.cb(err);
    });
  };

  return S;
};
