import Vue from 'vue';
import App from './App.vue';

import { createPlot, addPlotPanel } from './util/lz-helpers';

Vue.config.productionTip = false;

const app = new Vue({ render: h => h(App) })
    .$mount('#choose-gwas');

// LocusZoom exists outside the Vue instance, and responds to controls via event listeners
//  References to the plot and data_sources objects will be deliberately attached to root to
//  facilitate debugging
app.$on('config-ready', (name, reader, parser_options) => {
    if (!window.plot) {
        [window.plot, window.data_sources] = createPlot('#lz-plot', name, reader, parser_options);
    } else {
        addPlotPanel(window.plot, window.data_sources, name, reader, parser_options);
    }
});

app.$on('select-range', state => window.plot.applyState(state));
