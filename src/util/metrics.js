/**
 * Activate basic metrics for LocalZoom deployments
 * This module is primarily imported for its side effects (things it does when the code is first
 *  parsed)
 * Library users will rarely need to use this; it is a convenience for tracking usage as an app
 *
 * This approach allows us to collect metrics without modifying code internals, so that reusable
 *  components don't need to incorporate metrics code. It takes advantage of the fact that dynamic
 *  urls modifies the URL, which is an externally visible action.
 */

/**
 * Set up metrics to track certain features of interest within the LZ plot. This will help us
 *  derive information about which options are commonly used.
 * @param plot
 */
function setup_feature_metrics(plot) {
    if (!window.gtag) {
        // If google analytics isn't present, then there is nothing to do here.
        return;
    }
    plot.on('widget_save_png', () => {
        window.gtag('event', 'save_image', {
            event_category: 'features',
            event_label: 'png',
        });
    });
    plot.on('widget_save_svg', () => {
        window.gtag('event', 'save_image', {
            event_category: 'features',
            event_label: 'svg',
        });
    });
    plot.on('widget_gene_filter_choice', (event) => {
        window.gtag('event', 'filter_genes', {
            event_category: 'features',
            event_label: event.data.choice,
        });
    });
    plot.on('widget_association_display_options_choice', (event) => {
        window.gtag('event', 'association_display_options', {
            event_category: 'features',
            event_label: event.data.choice,
        });
    });
    plot.on('widget_set_ldpop', (event) => {
        window.gtag('event', 'ld_pop', {
            event_category: 'features',
            event_label: event.data.choice_value,
        });
    });
    plot.on('set_ldrefvar', (event) => {
        window.gtag('event', 'ld_refvar', {
            event_category: 'features',
        });
    });
}

// Hack: create an event we can listen to for `history.pushState` (no native one available)
// Ref: https://stackoverflow.com/a/25673911/1422268
const _wr = function _wr(type) {
    const orig = window.history[type];
    return function send_synthetic_event(...args) {
        const rv = orig.apply(this, args);
        const e = new Event(type);
        e.arguments = args;
        window.dispatchEvent(e);
        return rv;
    };
};

// Expose the count function so it can be called explicitly (eg for initial pageload).
const count_region_view = () => {
    if (window.gtag) {
        window.gtag('event', 'regionview');
    }
};

// Activate some metrics instantly whenever this module is loaded. These rely on events fired by
//   dynamic URLs and can be measured indirectly without a reference to the plot object.
// Metrics are only activated when google analytics script is installed
if (window.gtag) {
    // Monkey-patching wraps API calls to create a synthetic DOM event: icky, but necessary.
    window.history.pushState = _wr('pushState');

    // Count all region plots: back button = popstate; new view = pushState
    // We don't track replaceState, because different pages do not agree on how to load the first
    //  plot (if we forced one assumption, we might not count "first pageview" correctly)
    //  Eg, a direct link (position already in url) wouldn't need to call replaceState.
    window.addEventListener('popstate', count_region_view);
    window.addEventListener('pushState', count_region_view);
}

/**
 * Report when new tracks/ datatypes are added to the plot, so we can have a rough guess as
 *  to which visualization features get used most.
 * @param data_type
 */
const count_add_track = (data_type) => {
    if (!window.gtag) {
        return;
    }

    window.gtag('event', 'add_track', {
        event_category: 'features',
        event_label: data_type,
    });
};

export { count_add_track, count_region_view, setup_feature_metrics };
