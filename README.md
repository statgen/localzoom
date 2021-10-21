# LocalZoom

This is a tool for creating interactive [LocusZoom.js](https://github.com/statgen/locuszoom/) GWAS plots via the web browser, without uploading sensitive data to a remote web server. It works with Tabix-indexed data files in a variety of formats, and supports adding companion tracks (such as BED files).

Try it for yourself at [https://statgen.github.io/localzoom/](https://statgen.github.io/localzoom/) 


## Getting help
User and technical help is available via the [LocusZoom mailing list](http://groups.google.com/group/locuszoom).
Please specify that you are asking about "*LocalZoom*".

## Developer instructions
### Project setup
This project uses npm for dependency management. Typically, the build commands work with all actively supported NodeJS LTS releases.

```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Building for production
The production build is a minified, concatenated bundle suitable for distribution on a server.

In order to use the Sentry error logging and Google Analytics features, you will need to create a 
file named *.env.production.local* (ignored by git) with the following contents 
(both values are optional if you don't want to use these features): 
```dotenv
VUE_APP_SENTRY_DSN=https://dsn.example
VUE_APP_GOOGLE_ANALYTICS_KEY=UA-YOURKEY-1
```

Then build the assets to the `dist/` folder.
```bash
npm run build
```

If you are distributing this to our official GitHub pages location, there is a helper command that 
will update (and push) the `gh-pages` branch:
```bash
npm run deploy
```

When ready, verify the built app and push to production.

### Lint and fixes files
This project uses a style and syntax checker for code quality. The following command can help to 
identify (and automatically fix) common issues.
```
npm run lint
```

### Run unit tests
```
npm run test:unit
```
