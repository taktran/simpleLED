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

function SimpleLEDManager() {
  nitrogen.CommandManager.apply(this, arguments);
}

SimpleLEDManager.prototype = Object.create(nitrogen.CommandManager.prototype);
SimpleLEDManager.prototype.constructor = SimpleLEDManager;

SimpleLEDManager.prototype.isRelevant = function(message) {
  var relevant = ( (message.is('_lightOn') || message.is('_isOn')) &&
    (!this.device || message.from === this.device.id || message.to == this.device.id));

  return relevant;
};

SimpleLEDManager.prototype.isCommand = function(message) {
  return message.is('_lightOn');
};

SimpleLEDManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
  // Expires message
  if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg)) {
    return true;
  }

  var value = downstreamMsg.is("_isOn") &&
              downstreamMsg.isResponseTo(upstreamMsg) &&
              upstreamMsg.is("_lightOn");

  return value;
};

SimpleLEDManager.prototype.executeQueue = function(callback) {
  var self = this;

  if (!this.device) return callback(new Error('no device attached to control manager.'));

  // This looks at the list of active commands and returns if there's no commands to process.
  var activeCommands = this.activeCommands();
  if (activeCommands.length === 0) {
    this.session.log.warn('SimpleLEDManager::executeQueue: no active commands to execute.');
    return callback();
  }

  var lightOn;
  var commandIds = [];

  // Here we are going to find the final state and but collect all the active command ids because we'll use them in a moment.
  activeCommands.forEach(function(activeCommand) {
    lightOn = activeCommand.body.value;
    commandIds.push(activeCommand.id);
  });

  // This is the response to the _lightOn command.
  // Notice the response_to is the array of command ids from above. This is used in the obsoletes method above as well.
  var message = new nitrogen.Message({
    type: '_isOn',
    tags: nitrogen.CommandManager.commandTag(self.device.id),
    body: {
      command: {
        message: "Light (" + simpleLED.id + ") is " + JSON.stringify(lightOn) + " at " + Date.now()
      }
    },
    response_to: commandIds
  });

  message.send(this.session, function(err, message) {
    if (err) return callback(err);

    // let the command manager know we processed this _lightOn message by passing it the _isOn message.
    self.process(new nitrogen.Message(message));

    // need to callback if there aren't any issues so commandManager can proceed.
    return callback();
  });
};

SimpleLEDManager.prototype.start = function(session, callback) {

  var filter = {
    tags: nitrogen.CommandManager.commandTag(this.device.id)
  };

};





var service = new nitrogen.Service(config);

service.connect(simpleLED, function(err, session, simpleLED) {
  if (err) return console.log('failed to connect simpleLED: ' + err);

  new SimpleLEDManager(simpleLED).start(session, function(err, message) {
    if (err) return session.log.error(JSON.stringify(err));
  });
});
