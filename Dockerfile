FROM firstandthird/node:8.8-onbuild

ENTRYPOINT ["dumb-init", "node", "papertrail-cli.js"]
