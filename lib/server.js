#!/usr/bin/env node

var Path = require('path')
  , Optionall = require('optionall')
  , Async = require('async')
  , _ = require('underscore')
  , Str = require('underscore.string')
  , Belt = require('jsbelt')
  , Moment = require('moment')
  , FS = require('fs')
  , Util = require('util')
  , Events = require('events')
  , Winston = require('winston')
  , Crypto = require('crypto')
  , Express = require('express')
  , HTTP = require('http')
  , Sessions = require('express-session')
  , RedisSessions = require('connect-redis')(Sessions)
  , Morgan = require('morgan')
  , Multer = require('multer')
  , BodyParser = require('body-parser')
  , Cookie = require('cookie')
  , CookieParser = require('cookie-parser')
  , ErrorHandler = require('errorhandler')
  , ServeFavicon = require('serve-favicon')
  , Redis = require('redis')
  , Mongodb = require('mongodb')
  , Mongoose = require('mongoose')
  , Request = require('request')
  , SocketIO = require('socket.io')
  , Websocket = require('websocket')
  , Viewable = require('viewable')
  , Bluebird = require('bluebird')
;

module.exports = function(O){
  //////////////////////////////////////////////////////////////////////////////
  ////                            SETUP                                     ////
  //////////////////////////////////////////////////////////////////////////////

  var Opts = O || new Optionall({
                                  '__dirname': process.env.rootdir || Path.resolve(module.filename + '/../..')
                                , 'file_priority': [
                                    'package.json'
                                  , 'assets.json'
                                  , 'settings.json'
                                  , 'environment.json'
                                  , 'config.json'
                                  , 'credentials.json'
                                  ]
                                });

  var S = new (Events.EventEmitter.bind({}))();
  S.settings = Belt.extend({
    'log_level': 'debug'
  }, Opts);

  var log = Opts.log || new Winston.Logger();
  if (!Opts.log) log.add(Winston.transports.Console, {
    'level': S.settings.log_level
  , 'colorize': true
  , 'timestamp': false
  });
  S.log = log;

  //error handler
  S.on('error', function(err){
    log.error(err);
  });

////////////////////////////////////////////////////////////////////////////////
////SERVICES / DATA                                                         ////
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
////SETUP                                                                   ////
////////////////////////////////////////////////////////////////////////////////

  /*
    setup redis
  */
  S['setupRedis'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {

    });

    var ocb = _.once(a.cb);

    self['redis'] = Redis.createClient(a.o);

    self.redis.on('error', function(err){
      return self.emit('error', err);
    });

    self.redis.on('ready', function(){
      self.log.info('Connected to Redis...');
      return ocb();
    });
  };

  /*
    setup session store
  */
  S['setupSessions'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {

    });

    self['sessionsStore'] = new RedisSessions(a.o);

    a.cb();
    return self;
  };

  /*
    setup express server for incoming requests
  */
  S['setupServer'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      'cookie_secret': a.o.cookie_secret || Crypto.randomBytes(512).toString('utf-8')
    , 'body_parser': {
        'limit': '500mb'
      , 'parameterLimit': 10000
      , 'extended': true
      }
    , 'sessions': {
        'store': self.sessionsStore
      , 'secret': a.o.session_secret || Crypto.randomBytes(512).toString('utf-8')
      , 'cookie': {'maxAge': 60000000}
      , 'key': a.o.session_key
      , 'saveUninitialized': true
      , 'resave': true
      }
    , 'uploads': {
        'dest': self.settings.basecmd.uploads || a.o.uploads_path || './tmp'
      }
    , 'environment': self.settings.environment
    , 'verbose': true
    , 'data': true
    });

    self['express'] = Express();
    self.express.set('env', a.o.environment);
    self.express.set('port', a.o.port);

    /*
      middleware
    */
    self['logger'] = self.settings.environment === 'production'
      ? Morgan('common', {'skip': function(req, res) { return res.statusCode < 400; }})
      : Morgan('dev');
    self.express.use(self.logger);

    self['bodyParserJSON'] = BodyParser.json(a.o.body_parser);
    self.express.use(self.bodyParserJSON);

    self['bodyParserURLEncoded'] = BodyParser.urlencoded(a.o.body_parser);
    self.express.use(self.bodyParserURLEncoded);

    self['multer'] = Multer(a.o.uploads);
    self.express.use(self.multer);

    self['cookieParser'] = CookieParser(a.o.cookie_secret);
    self.express.use(self.cookieParser);

    self['sessions'] = Sessions(a.o.sessions);
    self.express.use(self.sessions);

    if (a.o.environment !== 'production'){
      self['errorHandler'] = ErrorHandler();
      self.express.use(self.errorHandler);
    }

    //self.express.use(ServeFavicon(Path.join(self.settings.__dirname, a.o.favicon)));

    self.express.disable('x-powered-by');
    self.express.set('trust proxy', true);

    /*
      starting server
    */
    self['httpServer'] = HTTP.createServer(self.express);
    self.httpServer.listen(a.o.port, function(){
      log.info('[HTTP] Express server started');
      log.info(Belt.stringify({
        'environment': a.o.environment.toUpperCase()
      , 'port': self.express.get('port')
      }));

      return a.cb();
    });

    if (a.o.verbose){
      self.express.all(/\.json$/i, function (req, res, next){
        log.warn(Belt.stringify({
          'route': req.path
        , 'query': req.query
        , 'body': req.body
        , 'params': req.params
        , 'files': req.files
        , 'headers': req.headers
        , 'session': req.session
        }));

        return next()
      });
    }

    if (a.o.data){
      self.express.all('*', function (req, res, next){
        req['data'] = function(){
          return _.extend({}, req.query || {}, req.body || {}, req.params || {});
        };

        return next()
      });
    }

    return self;
  };

  S['setupSocketIO'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {

    });

    self.io = SocketIO(self.httpServer);

    log.info('[SOCKETIO] Socket.io server started');

    return a.cb();
  };

  S['setupWebsocket'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //http_server
    });

    S['websocket_server'] = new Websocket.server({
      'httpServer': a.o.http_server
    , 'fragmentOutgoingMessages': false
    });

    log.info('[WEBSOCKET] Websocket server started');

    return a.cb();
  };

  S['addHelper'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //name
      //module
    });

    var S = new (Events.EventEmitter.bind({}))();

    S['instance'] = self;
    S['log'] = self.log;
    S['name'] = a.o.name;
    S['settings'] = _.extend({}, self.settings, {

    });

    self.helpers[a.o.name] = S;

    S.on('error', function(err){
      return self.emit('error', err);
    });

    S.once('ready', function(){
      log.info('Created helper [%s]...', a.o.name);
      return a.cb();
    });

    a.o.module(S)
  };

  S['addController'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //name
      //module
    });

    var S = new (Events.EventEmitter.bind({}))();

    S['instance'] = self;
    S['log'] = self.log;
    S['name'] = a.o.helper;
    S['model'] = Belt.get(self, 'db.model(' + S.name + ')');
    S['db'] = self.db;
    S['settings'] = _.extend({}, self.settings, {

    });

    self.controllers[a.o.name] = S;

    S.on('error', function(err){
      return self.emit('error', err);
    });

    S.once('ready', function(){
      log.info('Created controller [%s]...', a.o.name);
      return a.cb();
    });

    a.o.module(S)
  };

  S['setupMongodb'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //host
      //db
      'collections': []
    });

    return Async.waterfall([
      function(cb){
        return Mongodb.MongoClient.connect('mongodb://'
        + a.o.host
        + '/' + a.o.db
        , Belt.cs(cb, self, 'mongodb', 1, 0));
      }
    , function(cb){
        log.info('[MONGODB] Connected on mongodb://' + a.o.host + '/' + a.o.db);

        self['mongodb_collections'] = {};
        return Async.each(a.o.collections, function(e, cb2){
          return self.mongodb.collection(e, function(err, col){
            if (err) return cb2(err);

            log.info('[MONGODB] Created collection [' + e + ']');

            self.mongodb_collections[e] = col;
            return cb2();
          });
        }, Belt.cw(cb, 0));
      }
    ], function(err){
      return a.cb(err);
    });
  };

  S['setupMongoose'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {

    });

    Mongoose.Promise = Bluebird;

    self['db'] = Mongoose.createConnection(
      Util.format('mongodb://%s:%s/%s'
      , self.settings.mongodb.host
      , self.settings.mongodb.port
      , self.settings.mongodb.db
      )
    , {'server': {'poolSize': 15}});

    self.db.on('connected', function(){
      _.each(self.models, function(m, k){
        if (!_.isFunction(m)) return;

        self.log.info('[MONGOOSE] Creating model [%s]...', k);
        return self.db.model(k, new m(self.settings, self));
      });

      self.log.info(Util.format('[MONGOOSE] Models ready on mongodb://%s:%s/%s'
                            , self.settings.mongodb.host
                            , self.settings.mongodb.port
                            , self.settings.mongodb.db
                            ));
      return a.cb();
    });

    self.db.on('error', function(err){
      return self.emit('error', err, 'db');
    });

    self.db.on('disconnected', function(){
      return self.emit('error', new Error('Disconnected from Mongodb'), 'db');
    });
  };

  S['setupHelpers'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //paths
    });

    var gb = {};
    Async.waterfall([
      function(cb){
        self['helpers'] = [];

        _.each(a.o.paths, function(p){
          try {
            self.helpers = self.helpers.concat(
              _.chain(FS.readdirSync(Path.join(self.settings.__dirname, p)))
               .filter(function(f){ return f.match(/\.(js|json)$/i); })
               .map(function(f){ return Path.join(self.settings.__dirname, p, '/' + f); })
               .value()
            );
          } catch(e) {

          }
        });

        self.helpers = _.uniq(self.helpers);

        if (!_.any(self.helpers)) return cb();

        self.helpers = _.object(
                         _.map(self.helpers, function(g){ return g.split(Path.sep).pop().replace(/\.(js|json)$/i, ''); })
                       , _.map(self.helpers, function(g){ return require(g); })
                       );

        return Async.eachSeries(_.keys(self.helpers), function(k, cb2){
          if (!_.isFunction(self.helpers[k])) return cb2();

          return self.addHelper({
            'name': k
          , 'module': self.helpers[k]
          }, Belt.cw(cb2, 0));
        }, Belt.cw(cb, 0));
      }
    ], a.cb);

    return self;
  };

  S['setupModels'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //paths
    });

    var gb = {};
    Async.waterfall([
      function(cb){
        self['models'] = [];

        _.each(a.o.paths, function(p){
          try {
            self.models = self.models.concat(
              _.chain(FS.readdirSync(Path.join(self.settings.__dirname, p)))
               .filter(function(f){ return f.match(/\.js$/i); })
               .map(function(f){ return Path.join(self.settings.__dirname, p, Path.sep + f); })
               .value()
            );
          } catch(e) {

          }
        });

        self.models = _.uniq(self.models);

        if (!_.any(self.models)) return cb();

        self.models = _.object(
                         _.map(self.models, function(g){ return g.split(Path.sep).pop().replace(/\.js$/i, ''); })
                       , _.map(self.models, function(g){ return require(g); })
                       );

        return cb();
      }
    ], a.cb);

    return self;
  };

  S['setupControllers'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this;
    a.o = _.defaults(a.o, {
      //paths
    });

    var gb = {};
    Async.waterfall([
      function(cb){
        self['controllers'] = [];

        _.each(a.o.paths, function(p){
          try {
            self.controllers = self.controllers.concat(
              _.chain(FS.readdirSync(Path.join(self.settings.__dirname, p)))
               .filter(function(f){ return f.match(/\.(js|json)$/i); })
               .map(function(f){ return Path.join(self.settings.__dirname, p, Path.sep + f); })
               .value()
            );
          } catch(e) {

          }
        });

        self.controllers = _.uniq(self.controllers);

        if (!_.any(self.controllers)) return cb();

        self.controllers = _.object(
                         _.map(self.controllers, function(g){ return g.split(Path.sep).pop().replace(/\.(js|json)$/i, ''); })
                       , _.map(self.controllers, function(g){ return require(g); })
                       );

        return Async.eachSeries(_.keys(self.controllers), function(k, cb2){
          if (!_.isFunction(self.controllers[k])) return cb2();

          return self.addController({
            'name': k
          , 'module': self.controllers[k]
          }, Belt.cw(cb2, 0));
        }, Belt.cw(cb, 0));
      }
    ], a.cb);

    return self;
  };

  S['setupPublicRoutes'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //express
      //paths
    });

    return Async.waterfall([
      function(cb){
        _.each(a.o.paths, function(p){
          p = p.replace(/^\./, '');

          log.info('Adding public path [' + p + ']');

          p = p.replace(/\//g, '\\/');

          a.o.express.all(new RegExp('^' + p), function(req, res){
            var f = Belt.get(req, 'path');
            if (!f) return res.sendStatus(400);
            if (f.match(/\.\./)) return res.sendStatus(400);
            return res.sendFile(Path.join(self.settings.__dirname, f));
          });
        });

        return cb();
      }
    ], function(err){
      return a.cb(err);
    });
  };

  S['setupViews'] = function(options, callback){
    var a = Belt.argulint(arguments)
      , self = this
      , gb = {};
    a.o = _.defaults(a.o, {
      //paths
      //express
      'route': '/templates.js'
    , 'locals': {
        '_': _
      , 'Belt': Belt
      , 'Moment': Moment
      , 'Str': Str
      , 'Settings': self.settings
      }
    });

    return Async.waterfall([
      function(cb){
        self['viewable'] = new Viewable({
          'paths': a.o.paths
        , 'locals': a.o.locals
        , 'js_locals': [
            '_'
          , 'Moment'
          , 'Belt'
          , 'Str'
          ]
        });

        _.each(self.viewable.views, function(v, k){
          log.info('Created view [' + k + ']');
        });

        setInterval(function(){
          self.viewable['views_js'] = self.viewable.renderViewsJs();
        }, 10000);

        self.viewable['views_js'] = self.viewable.renderViewsJs();

        a.o.express.all(a.o.route, function(req, res){
          return res.status(200).type('application/javascript').end(self.viewable.views_js);
        });

        self['renderView'] = function(req, view, locals){
          return self.viewable.render(view, _.extend({}, {
            'Request': req
          , 'Viewable': self.viewable
          }));
        };

        return cb();
      }
    ], function(err){
      return a.cb(err);
    });
  };

  Async.waterfall([
    function(cb){
      return S.setupSessions(S.settings.redis, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupRedis(_.omit(S.settings.redis, ['prefix']), Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupServer(S.settings.express, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupSocketIO(S.settings.socket_io, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupPublicRoutes({
        'express': S.express
      , 'paths': S.settings.basecmd.public
      }, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupWebsocket(_.extend({}, S.settings.websocket, {
        'http_server': S.httpServer
      }), Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupViews({
        'express': S.express
      , 'paths': S.settings.basecmd.views
      }, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupMongodb(S.settings.mongodb, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupModels(_.extend({}, S.settings, {
        'paths': S.settings.basecmd.models
      }), Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupMongoose(S.settings, Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupHelpers(_.extend({}, S.settings, {
        'paths': S.settings.basecmd.helpers
      }), Belt.cw(cb, 0));
    }
  , function(cb){
      return S.setupControllers(_.extend({}, S.settings, {
        'paths': S.settings.basecmd.controllers
      }), Belt.cw(cb, 0));
    }
  ], function(err){
    if (err) return S.emit(err);

    log.info('/////READY/////');

    return S.emit('ready');
  });

  return S;
};

if (require.main === module){
  var M = new module.exports();
}
