const wreck = require('wreck');
const chalk = require('chalk');

const argv = require('yargs')
.option('timestamp', {
  describe: 'show the timestamp for each event',
  alias: 't',
  type: 'boolean',
  default: false
})
.option('source', {
  alias: 's',
  describe: 'show the source for each event',
  type: 'boolean',
  default: false
})
.option('program', {
  alias: 'p',
  describe: 'show the program for each event',
  type: 'boolean',
  default: false
})
.option('follow', {
  alias: 'f',
  describe: 'listen for new events, refresh rate specified by --delay ',
  type: 'boolean',
  default: false
})
.option('delay', {
  alias: 'd',
  describe: 'number of seconds to delay between refreshes',
  default: 2
})
.option('regex', {
  describe: 'regex to match',
  alias: 'o',
})
.option('token', {
  describe: 'authorization token',
  optional: false,
  default: process.env.PAPERTRAIL_TOKEN
})
.option('count', {
  alias: 'c',
  describe: 'maximum number of events to show, does not apply to refreshes when using follow mode',
  default: 1000,
  type: 'number'
})
.argv;

if (argv._.length === 0) {
  console.log('You must provide at least one search term');
  return;
}
const token = argv.t || argv.token;
const search = argv._.length > 1 ? argv._.join(' ') : `'${argv._[0]}'`;
const follow = argv.follow || argv.f;
// in follow mode we only show 50 logs per refresh:
let count = follow ? 50 : argv.count || argv.c;
const delayInMs = argv.delay * 1000;
let lastTimeQueried;
let lastId; // last event id that was logged, to prevent dupes

const printEvent = (event) => {
  const message = argv.o ? event.message.match(new RegExp(argv.o)) : event.message;
  const array = [];
  if (argv.timestamp) {
    array.push(chalk.gray(event.generated_at));
  }
  if (argv.source || argv.s) {
    array.push(chalk.yellow(event.source_name));
  }
  if (argv.program || argv.p) {
    array.push(chalk.blue(event.program));
  }
  array.push(message);
  if (message) {
    console.log(array.join(' '));
  }
};

const execute = () => {
  const host = `https://papertrailapp.com/api/v1/events/search.json?q=${search}&limit=${count}`;
  const url = lastTimeQueried ? `${host}&min_time=${lastTimeQueried + 1}` : host;
  wreck.get(url, { headers: {
      'X-Papertrail-Token': token
    },
    json: true
  }, (err, res, payload) => {
    payload.events.forEach(printEvent);
    if (payload.events.length !== 0) {
      lastTimeQueried = new Date(payload.events[payload.events.length - 1].received_at).getTime() / 1000;
    }
    if (follow) {
      // to avoid missing logs we up the count in follow mode:
      count = 1000;
      setTimeout(execute, delayInMs);
    }
  });
};
execute();
