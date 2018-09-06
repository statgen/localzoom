// vue.config.js
module.exports = {
    // This demonstration app uses a premade index file, rather than generated HTML templates.
    // This gives us finer control over the parts of the page that do not use Vue, at the expense
    //  of turning off some caching options.

    // disable hashes in filenames
    filenameHashing: false,
    // delete HTML related webpack plugins
    chainWebpack: (config) => {
        config.plugins.delete('html');
        config.plugins.delete('preload');
        config.plugins.delete('prefetch');
    },
};
