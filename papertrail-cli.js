const wreck = require('wreck');

const argv = require('yargs')
.option('timestamp', {
  describe: 'show the timestamp for each event',
  default: false
})
.option('system', {
  describe: 'show the system for each event',
  default: false
})
.option('program', {
  describe: 'show the program for each event',
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
const host = `https://papertrailapp.com/api/v1/events/search.json?q=${search}`;
const delayInMs = argv.delay * 1000;
let lastTimeQueried;

const printEvent = (event) => {
  const message = argv.o ? event.message.match(new RegExp(argv.o)) : event.message;
  const timestamp = argv.timestamp ? event.generated_at : '';
  const system = (argv.system || argv.s) ? event.system : '';
  const program = (argv.program || argv.p) ? event.program : '';
  const array = [timestamp, system, program, message].join(' ');
  if (message) {
    console.log(array);
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
