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
    //create_routes
  });

  S['count'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //populate
    });

    var query = Belt.cast(Belt.get(a.o, 'query') || {}, 'object')
      , qry = S.model.count(query);

    return qry.exec(a.cb);
  };

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
      , proj = Belt.cast(Belt.get(a.o, 'projection') || {}, 'object')
      , qry = S.model.find(query, proj).limit(limit).skip(skip);

    if (a.o.populate) qry.populate(a.o.populate);
    if (a.o.sort) qry.sort(a.o.sort);

    return qry.exec(a.cb);
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
      //data
      //pre
      //post
      //populate
    });

    return Async.waterfall([
      function(cb){
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
  };

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

        _.each(a.o.$array_set, function(v, k){
          _.each(v, function(v2, k2){
            var el = gb.doc.get(k).id(k2);
            if (!el) return;
            el.set(v2);
          });
        });

        return cb();
      }
    , function(cb){
        return gb.doc[a.o.save_method](Belt.cs(cb, gb, 'doc', 1, 0));
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
    , function(cb){
        if (!a.o.post) return cb();
        return a.o.post(gb.doc, a.o, Belt.cs(cb, gb, 'doc', 1, 0));
      }
    ], function(err){
      return a.cb(err);
    });
  };

  if (O.create_routes){

    S.instance.express.all('/' + S.name + '/count.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {

      });

      return Async.waterfall([
        function(cb){
          return self.count(a.o, Belt.cs(cb, gb, 'count', 1, 0));
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        , 'data': gb.count || 0
        });
      });
    });

    S.instance.express.all('/' + S.name + '/list.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {

      });

      return Async.waterfall([
        function(cb){
          return self.list(a.o, Belt.cs(cb, gb, 'docs', 1, 0));
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        , 'data': _.map(gb.docs, function(d){
            return d.toSanitizedObject(a.o);
          })
        });
      });
    });

    S.instance.express.all('/' + S.name + '/create.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {
        'data': Belt.copy(_.omit(a.o, [
          'populate'
        , 'pre'
        , 'post'
        , 'data'
        ]))
      });

      return Async.waterfall([
        function(cb){
          return self.create(a.o, Belt.cs(cb, gb, 'doc', 1, 0));
        }
      , function(cb){
          if (!gb.doc) return cb(new Error(self.name + ' not created'));

          return cb();
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        , 'data': Belt.call(gb, 'doc.toSanitizedObject', a.o)
        });
      });
    });

    S.instance.express.all('/' + S.name + '/:_id/read.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             , 'query': {
                 '_id': req.params._id
               }
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {

      });

      return Async.waterfall([
        function(cb){
          return self.read(a.o, Belt.cs(cb, gb, 'doc', 1, 0));
        }
      , function(cb){
          if (!gb.doc) return cb(new Error(self.name + ' not found'));

          return cb();
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        , 'data': Belt.call(gb, 'doc.toSanitizedObject', a.o)
        });
      });
    });

    S.instance.express.all('/' + S.name + '/read.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {
        'query': Belt.copy(a.o, _.omit([
          'session'
        , 'pre'
        , 'post'
        , 'populate'
        ]))
      });

      return Async.waterfall([
        function(cb){
          return self.read(a.o, Belt.cs(cb, gb, 'doc', 1, 0));
        }
      , function(cb){
          if (!gb.doc) return cb(new Error(self.name + ' not found'));

          return cb();
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        , 'data': Belt.call(gb, 'doc.toSanitizedObject', a.o)
        });
      });
    });

    S.instance.express.all('/' + S.name + '/:_id/update.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {
        'query': {
          '_id': req.params._id
        }
      });

      return Async.waterfall([
        function(cb){
          return self.update(a.o, Belt.cs(cb, gb, 'doc', 1, 0));
        }
      , function(cb){
          if (!gb.doc) return cb(new Error(self.name + ' not found'));

          return cb();
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        , 'data': Belt.call(gb, 'doc.toSanitizedObject', a.o)
        });
      });
    });

    S.instance.express.all('/' + S.name + '/:_id/delete.json', function(req, res){
      var a = {
        'o': _.extend({}, req.data(), {
               'session': req.session
             })
      }, self = S
       , gb = {};
      a.o = _.defaults(a.o, {
        'query': {
          '_id': req.params._id
        }
      });

      return Async.waterfall([
        function(cb){
          return self.delete(a.o, Belt.cw(cb, 0));
        }
      ], function(err){
        return res.status(200).json({
          'error': Belt.get(err, 'message')
        });
      });
    });

  }

  return S;
};
