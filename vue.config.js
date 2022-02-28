const autoprefixer = require('autoprefixer');

module.exports = {
    // Workaround: postcss throws an error about locuszoom.css when using yarn link
    // This rule enables LZ.js feature dev; it isn't required for most installs.
    // See: https://github.com/postcss/postcss-loader/issues/308#issue-269582257
    css: { loaderOptions: { postcss: { plugins: [autoprefixer] } } },
    chainWebpack: (config) => {
        config.module
            .rule('source-map-loader')
            .test(/\.js$/)
            .enforce('pre')
            .use('source-map-loader')
            .loader('source-map-loader')
            .end();
    },
    configureWebpack: {
        // Ensure that (decent) source maps are used, even in development
        devtool: (process.env.NODE_ENV === 'development') ? 'eval-source-map' : 'source-map',
    },
    publicPath: './',
};
