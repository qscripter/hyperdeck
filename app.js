var hyperdeck = require('./hyperdeck');

var deck = new hyperdeck('192.168.1.58');

deck.connect();
deck.on('ready', function() {
  deck.ping(function (response) {
    console.log('ping');
    console.log(response);
  });
  deck.ping(function (response) {
    console.log('ping');
    console.log(response);
  });
  deck.ping(function (response) {
    console.log('ping');
    console.log(response);
  });
  deck.ping(function (response) {
    console.log('ping');
    console.log(response);
  });
});