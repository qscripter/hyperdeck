var hyperdeck = require('./hyperdeck');

var deck = new hyperdeck('192.168.1.58');
console.log(deck);

deck.connect();

setTimeout(function () {
  deck.destroy();
}, 10000);