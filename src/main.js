import Vue from 'vue';
import App from './App.vue';

import { createPlot, addPanels } from './util/lz-helpers';

Vue.config.productionTip = false;

const app = new Vue({ render: h => h(App) })
    .$mount('#choose-gwas');

// LocusZoom exists outside the Vue instance, and responds to controls via event listeners
//  References to the plot and data_sources objects will be deliberately attached to root to
//  facilitate debugging
app.$on('config-ready', (source_options, plot_options) => {
    if (!window.plot) {
        [window.plot, window.data_sources] = createPlot('#lz-plot', source_options, plot_options);
    } else {
        addPanels(window.plot, window.data_sources, source_options, plot_options);
    }
});

app.$on('select-range', state => window.plot.applyState(state));
