var _ = require('lodash');
var util = require('util');
var events = require('events');
var telnet = require('./telnet');

function HyperDeck(ipAddress) {
  var self = this;

  self.ipAddress = ipAddress;
  events.EventEmitter.call(this);
  self.connection = new telnet();

  self.params = {
    host: ipAddress,
    port: 9993
  };

  self.connection.on('ready', function() {
    self.connection.exec('notify: transport: true', function(response) {
      setInterval(function () {
        self.ping();
      }, 10000); 
      self.emit('ready');
    });
  });

  self.connection.on('error', function(error) {
    console.log('error!');
    console.log(error);
  });

  self.connection.on('data', function(data) {
    console.log(data);
    self.emit('data', proccessData(data));
  });

  self.connection.on('timeout', function() {
    console.log('socket timeout!');
    self.connection.end();
  });

  self.connection.on('close', function() {
    console.log('connection closed');
  });

  



  if (false === (this instanceof HyperDeck)) return new HyperDeck();
}

util.inherits(HyperDeck, events.EventEmitter);

HyperDeck.prototype.connect = connect;
HyperDeck.prototype.destroy = destroy;
HyperDeck.prototype.ping = ping;
HyperDeck.prototype.getTransportInfo = getTransportInfo;



function connect() {
  var self = this;
  self.connection.connect(self.params);
}

function ping(callback) {
  var self = this;
  self.connection.exec('ping', function(response) {
    if (callback) {
      return callback(proccessData(response));
    }
  });
}

function getTransportInfo(callback) {
  var self = this;
  self.connection.exec('transport info', function(response) {
    if (callback) {
      return callback(proccessData(response));
    }
  });
}

function destroy() {
  var self = this;
  self.connection.destroy();
}

function proccessData(data) {
  var command = {};
  command.code = data[0].substr(0,3);
  command.timeStamp = new Date();
  command.message = data[0].substr(4).split(':')[0];
  command.params = {};
  _.map(data.splice(1), function(param) {
    command.params[param.split(':')[0]] = param.split(':')[1].substr(1);
  });
  return command;
}






module.exports = HyperDeck;