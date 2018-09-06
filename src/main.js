import Vue from 'vue';
import App from './App.vue';

import { createPlot, addPlotPanel } from '../util/lz-helpers';

Vue.config.productionTip = false;

const app = new Vue({ render: h => h(App) })
    .$mount('#choose-gwas');

// LocusZoom exists outside the Vue instance, and responds to controls via event listeners
// TODO: Clean up usage of globals
app.$on('config-ready', (name, reader, options) => {
    if (!window.plot) {
        createPlot(name, reader, options);
    } else {
        addPlotPanel(name, reader, options);
    }
});

app.$on('select-range', state => window.plot.applyState(state));
