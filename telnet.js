var _ = require('lodash');

var util = require('util');
var events = require('events');
var net = require('net');
var socket = new net.Socket();


// define a constructor (object) and inherit EventEmitter functions
function Telnet() {
  events.EventEmitter.call(this);
  if (false === (this instanceof Telnet)) return new Telnet();
}

util.inherits(Telnet, events.EventEmitter);

Telnet.prototype.connect = function(opts) {
  var self = this;
  var host = (typeof opts.host !== 'undefined' ? opts.host : '127.0.0.1');
  var port = (typeof opts.port !== 'undefined' ? opts.port : 23);
  this.timeout = (typeof opts.timeout !== 'undefined' ? opts.timeout : 500);

  this.irs = (typeof opts.irs !== 'undefined' ? opts.irs : '\r\n');
  this.ors = (typeof opts.ors !== 'undefined' ? opts.ors : '\n');

  this.response = '';
  this.telnetState = {};

  this.telnetSocket = net.createConnection({
    port: port,
    host: host
  }, function() {
    self.telnetState = 'start';
    self.stringData = '';
    self.emit('connect');
  });

  this.telnetSocket.on('data', function(data) {
    var rawData = parseData(data, self);
    if (rawData) {
      rawData = rawData.split(self.irs);
      _.pull(rawData, '');
      self.emit('data', rawData);
    }
  });

  this.telnetSocket.on('error', function(error) {
    self.emit('error', error);
  });

  this.telnetSocket.on('end', function() {
    self.emit('end');
  });

  this.telnetSocket.on('close', function() {
    self.emit('close');
  });
};

Telnet.prototype.exec = function(cmd, opts, callback) {
  var self = this;
  cmd += this.ors;

  if (opts && opts instanceof Function) callback = opts;
  else if (opts && opts instanceof Object) {
    self.shellPrompt = opts.shellPrompt || self.shellPrompt;
    self.loginPrompt = opts.loginPrompt || self.loginPrompt;
    self.timeout = opts.timeout || self.timeout;
    self.irs = opts.irs || self.irs;
    self.ors = opts.ors || self.ors;
    self.echoLines = opts.echoLines || self.echoLines;
  }

  if (this.telnetSocket.writable && self.telnetState === 'sendcmd') {
    self.telnetState = 'write';
    this.telnetSocket.write(cmd, function() {
      self.telnetState = 'response';
      self.emit('writedone');

      var timeout = setTimeout(function () {
        self.emit('error', 'timeout');
        self.telnetState = 'write';
      }, 5000);

      self.once('responseready', function() {
        self.telnetState = 'sendcmd';
        clearTimeout(timeout);
        if (callback && self.cmdOutput !== 'undefined') {
          _.pull(self.cmdOutput, '');
          callback(self.cmdOutput);
        }
        else if (callback && self.cmdOutput === 'undefined'){
          callback();
        }

        // reset stored response
        self.stringData = '';
      });
    });
  } else {
    // try command again when pipe ready
    setTimeout(function () {
      self.exec(cmd, opts, callback);
    }, 100);
  }
};

Telnet.prototype.end = function() {
  this.telnetSocket.end();
};

Telnet.prototype.destroy = function() {
  this.telnetSocket.destroy();
};

function parseData(chunk, telnetObj) {
  var promptIndex = '';

  if (chunk[0] === 255 && chunk[1] !== 255) {
    telnetObj.stringData = '';
    var negReturn = negotiate(telnetObj, chunk);

    if (negReturn === undefined) return;
    else chunk = negReturn;
  }
  

  if (telnetObj.telnetState === 'start') {
    telnetObj.telnetState = 'sendcmd';
    telnetObj.stringData = '';
    telnetObj.emit('ready', telnetObj.shellPrompt);
  } else if (telnetObj.telnetState === 'response') {
    var stringData = chunk.toString();
    telnetObj.stringData += stringData;
    promptIndex = stringData.search(telnetObj.shellPrompt);

    telnetObj.cmdOutput = telnetObj.stringData.split(telnetObj.irs);

    telnetObj.telnetState = 'responseready';
    telnetObj.emit('responseready');
  } else {
    return chunk.toString();
  }
}

function negotiate(telnetObj, chunk) {
  // info: http://tools.ietf.org/html/rfc1143#section-7
  // refuse to start performing and ack the start of performance
  // DO -> WONT; WILL -> DO
  var packetLength = chunk.length, negData = chunk, cmdData, negResp;

  for (var i = 0; i < packetLength; i+=3) {
    if (chunk[i] != 255) {
      negData = chunk.slice(0, i);
      cmdData = chunk.slice(i);
      break;
    }
  }

  negResp = negData.toString('hex').replace(/fd/g, 'fc').replace(/fb/g, 'fd');

  if (telnetObj.telnetSocket.writable)
    telnetObj.telnetSocket.write(Buffer(negResp, 'hex'));

  if (cmdData !== undefined) return cmdData;
  else return;
}


module.exports = Telnet;