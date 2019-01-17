# LocalZoom

This is a demonstration of loading GWAS results via the web browser, fetching only the data 
required for that region. It works with Tabixed GWAS data files in a variety of formats.

A live [demonstration](https://abought.github.io/locuszoom-tabix/) is available. 


## Getting help
User and technical help is available via the [LocusZoom mailing list](http://groups.google.com/group/locuszoom).
Please specify that you are asking about "*LocalZoom*".

## Developer instructions
### Project setup
This project uses [Yarn](https://yarnpkg.com/lang/en/docs/install/) for dependency 
management.
 
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn run serve
```

### Building for production
The production build is a minified, concatenated bundle suitable for distribution on a server.

In order to use the Sentry error logging feature, you will need to create a file named 
*.env.production.local* (ignored by git) with the following contents: 
```dotenv
VUE_APP_SENTRY_DSN=https://dsn.example
```

Then build the assets to the `dist/` folder.
```bash
yarn run build
```

If you are distributing this to our official GitHub pages location, there is a helper command that 
will update (but not push) the `gh-pages` branch:
```bash
yarn run deploy
```

When ready, verify the built app and push to production.

### Lints and fixes files
This project uses a style and syntax checker for code quality. The following command can help to 
identify (and automatically fix) common issues.
```
yarn run lint
```

### Run unit tests
```
yarn run test:unit
```
