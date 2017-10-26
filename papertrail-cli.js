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
  alias: 'r',
})
.option('token', {
  describe: 'authorization token',
  optional: false
})
.argv;

const token = argv.t || argv.token;
const search = argv._[0];
const host = `https://papertrailapp.com/api/v1/events/search.json?$q={search}`;
const delayInMs = argv.delay * 1000;

const printEvent = (event) => {
  const message = argv.o ? event.message.match(new RegExp(argv.o)) : event.message;
  const timestamp = argv.timestamp ? event.generated_at : '';
  const system = (argv.system || argv.s) ? event.system : '';
  const program = (argv.program || argv.p) ? event.program : '';
  if (message) {
    console.log(`${timestamp} ${system} ${program} ${message}`);
  }
};

const execute = () => {
  wreck.get(`${host}`, {
    headers: {
      'X-Papertrail-Token': token
    },
    json: true
  }, (err, res, payload) => {
    payload.events.forEach(printEvent);
    setTimeout(execute, delayInMs);
  });
};

execute();
