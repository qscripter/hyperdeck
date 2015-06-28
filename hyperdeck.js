var _ = require('lodash');
var util = require('util');
var events = require('events');
var telnet = require('./telnet');

function HyperDeck(ipAddress) {
  var self = this;

  self.ipAddress = ipAddress;
  self.remoteEnabled = false;
  events.EventEmitter.call(this);
  self.connection = new telnet();
  self.connectionStatus = 'Not Connected';

  self.params = {
    host: ipAddress,
    port: 9993
  };

  self.connection.on('ready', function() {
    self.connectionStatus = 'Connected';
    self.connection.exec('notify: transport: true', function(response) {
      self.statusPing = setInterval(function () {
        self.ping();
      }, 10000);
      self.emit('ready');
    });
  });

  self.connection.on('error', function(error) {
    self.connectionStatus = 'Error';
    console.log(error);
  });

  self.connection.on('data', function(data) {
    self.emit('data', processData(data));
  });

  self.connection.on('timeout', function() {
    console.log('socket timeout!');
    self.connection.end();
    self.connectionStatus = 'Timed Out';
  });

  self.connection.on('close', function() {
    self.connectionStatus = 'Closed';
  });

  



  if (false === (this instanceof HyperDeck)) return new HyperDeck();
}

util.inherits(HyperDeck, events.EventEmitter);

HyperDeck.prototype.connect = connect;
HyperDeck.prototype.destroy = destroy;
HyperDeck.prototype.ping = ping;
HyperDeck.prototype.getTransportInfo = getTransportInfo;
HyperDeck.prototype.getConfiguration = getConfiguration;
HyperDeck.prototype.setRemote = setRemote;
HyperDeck.prototype.transportCommand = transportCommand;



function connect() {
  var self = this;
  self.connection.connect(self.params);
}

function ping(callback) {
  var self = this;
  self.connection.exec('ping', function(response) {
    if (callback) {
      return callback(processData(response));
    }
  });
}

function getTransportInfo(callback) {
  var self = this;
  if (self.connectionStatus === 'Connected')
  {
    self.connection.exec('transport info', function(response) {
      if (callback) {
        self.transportInfo = processData(response);
        return callback(self.transportInfo);
      }
    });
  }
}

function getConfiguration(callback) {
  var self = this;
  if (self.connectionStatus === 'Connected')
  {
    self.connection.exec('configuration', function(response) {
      if (callback) {
        self.configurationInfo = processData(response);
        return callback(self.configurationInfo);
      }
    });
  }
}

function setRemote(remote, callback) {
  var self = this;
  if (self.connectionStatus === 'Connected') {
    self.connection.exec('remote: enable: ' + remote, function (response) {
      self.remoteEnabled = true;
      if (callback) {
        return callback(processData(response));
      }
    });
  }
}

function transportCommand(command, callback) {
  var self = this;
  if (self.remoteEnabled && self.connectionStatus === 'Connected') {
    self.connection.exec(command, function (response) {
      if (callback) {
        return callback(processData(response));
      }
    });
  } else {
    if (callback) {
      return callback(false);
    }
  }
}

function destroy() {
  var self = this;
  self.connection.destroy();
}

function processData(data) {
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