const wreck = require('wreck');

const argv = require('yargs')
.option('timestamp', {
  describe: 'show the timestamp for each event',
  type: 'boolean',
  default: false
})
.option('system', {
  describe: 'show the system for each event',
  type: 'boolean',
  default: false
})
.option('program', {
  describe: 'show the program for each event',
  type: 'boolean',
  default: false
})
.option('delay', {
  describe: 'number of seconds to delay',
  default: 2
})
.option('regex', {
  describe: 'regex to match',
  alias: 'o',
})
.option('token', {
  describe: 'authorization token',
  optional: false
})
.argv;

const token = argv.t || argv.token;
const search = argv._.join(' ');
const host = `https://papertrailapp.com/api/v1/events/search.json?q='${search}'`;
const delayInMs = argv.delay * 1000;
let lastTimeQueried;

const printEvent = (event) => {
  const message = argv.o ? event.message.match(new RegExp(argv.o)) : event.message;
  const array = [];
  if (argv.timestamp) {
    array.push(event.generated_at);
  }
  if (argv.system || argv.s) {
    array.push(event.system);
  }
  if (argv.program || argv.p) {
    array.push(event.program);
  }
  array.push(message);
  if (message) {
    console.log(array.join(' '));
  }
};

const execute = () => {
  const url = lastTimeQueried ? `${host}&min_time=${lastTimeQueried}` : host;
  wreck.get(url, { headers: {
      'X-Papertrail-Token': token
    },
    json: true
  }, (err, res, payload) => {
    payload.events.forEach(printEvent);
    if (payload.events.length !== 0) {
      lastTimeQueried = new Date(payload.events[payload.events.length - 1].generated_at).getTime() / 1000;
    }
    setTimeout(execute, delayInMs);
  });
};

execute();
