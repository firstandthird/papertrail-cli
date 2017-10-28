FROM firstandthird/node:8.8-onbuild

ENTRYPOINT ["node", "papertrail-cli.js"]
