module.exports = {
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
