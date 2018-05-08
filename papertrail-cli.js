const wreck = require('wreck');
const chalk = require('chalk');
const readline = require('readline');

const argv = require('yargs')
.option('timestamp', {
  describe: 'show the timestamp for each event',
  alias: 't',
  type: 'boolean',
  default: false
})
.option('source', {
  alias: 's',
  describe: 'show the source (source_name) of each event',
  type: 'boolean',
  default: false
})
.option('searches', {
  describe: 'list saved searches',
  type: 'boolean',
  default: false
})
.option('search', {
  alias: 'r',
  describe: 'execute a saved search',
  type: 'string',
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
.option('exclude', {
  alias: 'x',
  describe: 'exclude events that contain this term',
  default: false,
  type: 'string'
})
.option('token', {
  describe: 'authorization token',
  optional: false,
  default: process.env.PAPERTRAIL_TOKEN
})
.option('count', {
  alias: 'c',
  describe: 'maximum number of events to show, does not apply to refreshes when using follow mode',
  default: 10,
  type: 'number'
})
.argv;

const token = argv.token;

const runAll = async () => {
  const getSearches = async () => {
    const { res, payload } = await wreck.get('https://papertrailapp.com/api/v1/searches.json', { headers: {
        'X-Papertrail-Token': token
      },
      json: true
    });
    return payload;
  };

  if (argv.searches) {
    const execute = async () => {
      const savedSearches = await getSearches();
      savedSearches.forEach(item => {
        console.log(`Name: ${chalk.yellow(item.name)} Query: ${chalk.yellow(item.query)} Group: ${chalk.yellow(item.group.name)}`);
      })
    };
    execute();
    return;
  }

  let savedSearch;
  let search;
  // --search [name] without an argument just re-runs the saved search:
  if (argv.search) {
    // get the indicated search:
    const execute = async () => {
      const searches = await getSearches();
      for (let i = 0; i < searches.length; i++) {
        if (searches[i].name === argv.search) {
          savedSearch = searches[i];
          break;
        }
      }
      if (!savedSearch) {
        console.log(`Unable to find a saved search with the name "${argv.search}"`);
        process.exit();
      }
      search = savedSearch.query;
    };
    await execute();
    if (argv._.length > 0) {
      // --search [name] [term] with an argument adds the argument to the saved search query
      search = `${savedSearch.query} ${argv._.join(' ')}`;
    }
  }
  if (!search) {
    if (argv._.length === 0) {
      console.log('You must provide at least one search term');
      return;
    }
    search = argv._.join(' ');
    if (argv.exclude) {
      search += ` -"${argv.exclude}"`;
    }
  }
  search = encodeURIComponent(search);
  const follow = argv.follow || argv.f;
  // in follow mode we only show 50 logs per refresh:
  let count = follow ? 50 : argv.count || argv.c;
  const delayInMs = argv.delay * 1000;
  let lastIdQueried;
  let lastId; // last event id that was logged, to prevent dupes

  const printEvent = (event) => {
    const message = argv.o ? event.message.match(new RegExp(argv.o)) : event.message;
    const array = [];
    if (argv.timestamp || argv.t) {
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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const execute = async () => {
    const host = `https://papertrailapp.com/api/v1/events/search.json?q=${search}&limit=${count}`;
    let url;
    if (follow) {
      url = lastIdQueried ? `${host}&min_id=${lastIdQueried}` : host;
    } else {
      url = lastIdQueried ? `${host}&max_id=${lastIdQueried}` : host;
    }
    const { res, payload } = await wreck.get(url, { headers: {
        'X-Papertrail-Token': token
      },
      json: true
    });
    if (!follow) {
      payload.events = payload.events.reverse();
    }
    // list events in order recieved if following, otherwise print them newest to oldest:
    payload.events.forEach(printEvent);
    if (follow) {
      // to avoid missing logs we up the count in follow mode:
      count = 1000;
      if (payload.events.length !== 0) {
        // last id will be the highest one:
        lastIdQueried = payload.max_id;
      }
      setTimeout(execute, delayInMs);

    } else {
      rl.question('Hit enter to continue or ctrl-c to quit', answer => {
        lastIdQueried = payload.min_id;//events[ payload.events.length > 10 ? 9 : payload.events.length - 1].id
        execute();
      });
    }
  };
  execute();
};

runAll();
