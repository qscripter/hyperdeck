var hyperdeck = require('./hyperdeck');
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
// var mongoose = require('mongoose');
// var Schema = mongoose.Schema;

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8888 });

//mongoose.connect('mongodb://localhost/test');

// var hyperdeckSchema = new Schema({
//   name:String,
//   description:String,
//   ipAddress:String,
//   active:Boolean,
//   connectionStatus:String,
//   remoteEnabled:Boolean
// });

// var eventSchema = new Schema({
//   hyperDeck:Schema.Types.ObjectId,
//   timeStamp:Date,
//   message:String,
//   params: {}
// });

// var HyperDeck = mongoose.model('HyperDeck', hyperdeckSchema, 'hyperdecks');
// var Event = mongoose.model('Event', eventSchema, 'events');

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(JSON.stringify(data));
  });
};

var deckDoc = {
  _id: 123456,
  name: 'Prospect House',
  description: 'July 4th Prospect House Record Deck',
  ipAddress: '192.168.1.58',
  active: true,
  connectionStatus: '',
  remoteEnabled: false
};

var events = [];

// initialize hyperdeck controller
var deck = new hyperdeck(deckDoc.ipAddress);
var decks = {};

decks[deckDoc._id] = deck;

deck.on('data', function (data) {
  events.unshift(data);
  events = events.splice(0,50);
  wss.broadcast({
    _id: deckDoc._id,
    event: data
  });
});

deck.on('ready', function() {
  wss.broadcast({
    _id: deckDoc._id,
    connectionStatus: 'Connected'
  });
});

deck.on('timeout', function() {
  wss.broadcast({
    _id: deckDoc._id,
    connectionStatus: 'Timed Out'
  });
});

var app = express();

app.use(express.static('app'));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendFile('app/index.html');
});

app.get('/api/hyperdecks', function (req, res) {
  var doc = [deckDoc];
  doc = _.map(doc, annotateHyperdeck);
  res.send(doc);
});

app.get('/api/hyperdecks/:id/transport-info', function (req, res) {
  if (decks[req.params.id]) {
    decks[req.params.id].getTransportInfo(function (info) {
      res.send(info);
    });
  } else {
    res.send([]);
  }
});

app.get('/api/hyperdecks/:id/configuration', function (req, res) {
  if (decks[req.params.id]) {
    decks[req.params.id].getConfiguration(function (info) {
      res.send(info);
    });
  } else {
    req.send([]);
  }
});

app.get('/api/hyperdecks/:id/slot/:slot', function (req, res) {
  if (decks[req.params.id]) {
    decks[req.params.id].getSlotInfo(req.params.slot, function (info) {
      res.send(info);
    });
  } else {
    req.send([]);
  }
});

app.post('/api/hyperdecks/:id/command', function (req, res) {
  if (_.has(req.body, 'remote')) {
    deck.setRemote(req.body.remote);
  }
  if (_.has(req.body, 'transportCommand')) {
    deck.transportCommand(req.body.transportCommand);
  }
  if (_.has(req.body, 'connect')) {
    deck.connect();
  }
  res.send('command executed');
});

app.get('/api/events', function (req, res) {
  res.send(events);
});

app.listen(3000);


function annotateHyperdeck(deckDoc) {
  deckDoc.connectionStatus = deck.connectionStatus;
  deckDoc.remoteEnabled = deck.remoteEnabled;
  return deckDoc;
}