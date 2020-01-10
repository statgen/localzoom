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

if (window.gtag) { // Metrics are only activated when google analytics script is installed
    // Monkey-patching wraps API calls to create a synthetic DOM event: icky, but necessary.
    window.history.pushState = _wr('pushState');

    // Count all region plots: back button = popstate; new view = pushState
    // We don't track replaceState, because different pages do not agree on how to load the first
    //  plot (if we forced one assumption, we might not count "first pageview" correctly)
    //  Eg, a direct link (position already in url) wouldn't need to call replaceState.
    window.addEventListener('popstate', count_region_view);
    window.addEventListener('pushState', count_region_view);
}

export default count_region_view;
