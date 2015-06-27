var hyperdeck = require('./hyperdeck');
var _ = require('lodash');
var express = require('express');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/test');

var decks = {};

var hyperdeckSchema = new Schema({
  name:String,
  description:String,
  ipAddress:String,
  active:Boolean
});

var eventSchema = new Schema({
  hyperDeck:Schema.Types.ObjectId,
  timeStamp:Date,
  message:String,
  params: {}
});

var HyperDeck = mongoose.model('HyperDeck', hyperdeckSchema, 'hyperdecks');
var Event = mongoose.model('Event', eventSchema, 'events');

var app = express();

HyperDeck.find({active: true}, function (err, doc) {
  _.map(doc, function(deckDoc) {
    var deck = new hyperdeck(deckDoc.ipAddress);
    deck.connect();
    decks[deckDoc._id] = deck;

    deck.on('data', function (data) {
      var dataEvent = new Event(data);
      dataEvent.hyperDeck = deckDoc._id;
      dataEvent.save();
    });
  });
});

app.get('/', function(req, res) {
  res.send('Hello world');
});

app.get('/hyperdecks', function (req, res) {
  console.log(decks);
  HyperDeck.find({active: true}, function (err, doc) {
    res.send(doc);
  });
});

app.listen(3000);