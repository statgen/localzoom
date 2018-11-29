/* global $ */
import Vue from 'vue';

import App from './App.vue';
import { createPlot, addPanels, sourceName } from './util/lz-helpers';
import { createTable } from './util/credible-set-ui';

Vue.config.productionTip = false;

const PLOT_ID = '#lz-plot';
const CREDSET_TABLE_SELECTOR = $('#credible-set-table');
const CREDSET_OPTION_SELECTOR = $('#credible-set-datasets');
const CREDSET_BUTTON_SELECTOR = $('#credible-set-download');

const app = new Vue({ render: h => h(App) })
    .$mount('#choose-gwas');

// LocusZoom exists outside the Vue instance, and responds to controls via event listeners
//  References to the plot and data_sources objects will be deliberately attached to root to
//  facilitate debugging
app.$on('config-ready', (source_options, plot_options) => {
    if (!window.plot) {
        [window.plot, window.data_sources] = createPlot(PLOT_ID, source_options, plot_options);
        if (plot_options.annotations.credible_sets) {
            // Show the UI
            $('#credible-set-ui').removeClass('d-none');
        }
    } else {
        addPanels(window.plot, window.data_sources, source_options, plot_options);
    }
    if (plot_options.annotations.credible_sets) {
        $(`<option value="${source_options.label}">${source_options.label}</option>`).appendTo(CREDSET_OPTION_SELECTOR);
    }
});

// Redraw the plot whenever region selection changes
app.$on('select-range', state => window.plot.applyState(state));

// Control drawing of credible set results table (if this feature is selected)
CREDSET_OPTION_SELECTOR.change(function () {
    CREDSET_BUTTON_SELECTOR.removeClass('d-none');

    const source_label = $(this).val();
    const source_name = sourceName(source_label);

    // Remove the previous table, and remake the layout so it is associated with the correct data
    CREDSET_TABLE_SELECTOR.html('');
    createTable(CREDSET_TABLE_SELECTOR, source_name);

    window.plot.subscribeToData([
        `assoc_${source_name}:variant`, `assoc_${source_name}:chromosome`,
        `assoc_${source_name}:position`, `assoc_${source_name}:ref_allele`,
        `assoc_${source_name}:alt_allele`, `assoc_${source_name}:log_pvalue`,
        `credset_${source_name}:is_member`,
        `credset_${source_name}:posterior_prob`,
    ], (data) => {
        const credible = data.filter(item => item[`credset_${source_name}:is_member`]);
        CREDSET_TABLE_SELECTOR.tabulator('setData', credible);
    });
    // In this use case, the plot already has data; make sure it feeds data to the table immediately
    window.plot.emit('data_rendered');
});

CREDSET_BUTTON_SELECTOR.on('click', () => {
    CREDSET_TABLE_SELECTOR.tabulator('download', 'csv', 'credible-set-members.csv');
});
