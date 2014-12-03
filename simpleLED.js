var Store = require('nitrogen-leveldb-store');
var nitrogen = require('nitrogen');

var config = {
  host: process.env.HOST_NAME || 'api.nitrogen.io',
  http_port: process.env.PORT || 443,
  protocol: process.env.PROTOCOL || 'https',
  api_key: "b5cb9a865e653dea9bcf29d076d78828"
};

config.store = new Store(config);

var simpleLED = new nitrogen.Device({
  nickname: 'simpleLED',
  name: 'My LED',
  tags: [
    'sends:_isOn',
    'executes:_lightOn'
  ],
  api_key: config.api_key
});

var service = new nitrogen.Service(config);

service.connect(simpleLED, function(err, session, simpleLED) {
  if (err) return console.log('failed to connect simpleLED: ' + err);

  var message = new nitrogen.Message({
    type: '_isOn',
    body: {
      command: {
        message: "Light (" + simpleLED.id + ") is On at " + Date.now()
      }
    }
  });

  message.send(session);
});