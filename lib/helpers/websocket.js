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
  S['sockets'] = {};

  S.instance.websocket_server.on('request', function(request){
    console.log('Websocket connection...');

    var connection = request.accept();

    connection.on('message', function(message){
      try {
        var json = Belt.parse(message.utf8Data);
        log.info(Belt.stringify(json));

        connection['__messages'] = connection.__messages || [];
        connection.__messages.push(json);

        if (json.user) S.sockets[json.user] = connection;

      } catch(e){
        log.info('Unparseable websocket message: ' + message.utf8Data);
        log.error(e);
      }
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
