var hyperdeck = require('./hyperdeck');
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser')
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/test');

var decks = {};

var hyperdeckSchema = new Schema({
  name:String,
  description:String,
  ipAddress:String,
  active:Boolean,
  connectionStatus:String,
  remoteEnabled:Boolean
});

var eventSchema = new Schema({
  hyperDeck:Schema.Types.ObjectId,
  timeStamp:Date,
  message:String,
  params: {}
});

var HyperDeck = mongoose.model('HyperDeck', hyperdeckSchema, 'hyperdecks');
var Event = mongoose.model('Event', eventSchema, 'events');

// initialize hyperdeck controllers
HyperDeck.find({active: true}, function (err, doc) {
  _.map(doc, function(deckDoc) {
    var deck = new hyperdeck(deckDoc.ipAddress);
    decks[deckDoc._id] = deck;

    deck.on('data', function (data) {
      var dataEvent = new Event(data);
      dataEvent.hyperDeck = deckDoc._id;
      dataEvent.save();
    });
  });
});

var app = express();

app.use(express.static('app'));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.sendFile('app/index.html');
});

app.get('/api/hyperdecks', function (req, res) {
  HyperDeck.find(req.query, function (err, doc) {
    doc = _.map(doc, annotateHyperdeck);
    res.send(doc);
  });
});

app.get('/api/hyperdecks/:id/transport-info', function (req, res) {
  if (decks[req.params.id]) {
    decks[req.params.id].getTransportInfo(function (info) {
      res.send(info);
    });
  } else {
    req.send([]);
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

app.post('/api/hyperdecks/:id/command', function (req, res) {
  var deck;
  if (!decks[req.params.id]) {
    res.send(false);
  } else {
    deck = decks[req.params.id];
  }
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
  Event.find({
    hyperDeck: req.query.hyperDeck
  })
  .sort({timeStamp: -1})
  .limit(50)
  .exec(function (err, doc) {
    res.send(doc);
  });
});

app.listen(3000);


function annotateHyperdeck(deckDoc) {
  if (decks[deckDoc._id]) {
    deckDoc.connectionStatus = decks[deckDoc._id].connectionStatus;
    deckDoc.remoteEnabled = decks[deckDoc._id].remoteEnabled;
  }
  return deckDoc;
}