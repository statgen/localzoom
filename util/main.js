/* global gwasChooser, LocusZoom, Vue */
// import { REGEX_MARKER } from './constants';

Vue.config.productionTip = false;

LocusZoom.KnownDataSources.extend('AssociationLZ', 'TabixAssociationLZ', {
    parseInit(init) {
        this.params = init.params;
        this.reader = init.tabix_reader;
    },
    getCacheKey(state, chain, fields) {
        return [state.chr, state.start, state.end].join('_');
    },
    fetchRequest(state, chain, fields) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.reader.fetch(state.chr, state.start, state.end, (data, err) => {
                if (err) {
                    reject(err);
                }
                resolve(data);
            });
        });
    },
    normalizeResponse(data) {
        const self = this;
        return data.map((row) => {
            const fields = row.split(self.params.delimiter);

            const marker = fields[self.params.marker_col - 1];
            const epacts_pattern = /(?:chr)?(.+):(\d+)_?(\w+)?\/?([^_]+)?_?(.*)?/;

            const match = marker.match(epacts_pattern);
            if (!match) {
                // eslint-disable-next-line no-throw-literal
                throw 'Could not understand marker format. Must be of format chr:pos or chr:pos_ref/alt';
            }

            const pvalue_raw = +fields[self.params.pvalue_col - 1];
            const log_pval = self.params.is_log_p ? pvalue_raw : -Math.log10(pvalue_raw);

            return {
                chromosome: match[1],
                position: +match[2],
                ref_allele: match[3] || null, // Simple markers may not provide variant info
                log_pvalue: log_pval, // TODO: Improve handling of very small pvalues
                variant: marker,
            };
        });
    },
});

function createPlot(name, reader, params = {}) {
    params.id_field = 'variant';

    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const data_sources = new LocusZoom.DataSources()
        .add('assoc', ['TabixAssociationLZ', {
            tabix_reader: reader,
            params,
        }])
        .add('ld', ['LDLZ', { url: `${apiBase}pair/LD/` }])
        .add('gene', ['GeneLZ', {
            url: `${apiBase}annotation/genes/`,
            params: { source: 2 },
        }])
        .add('recomb', ['RecombLZ', {
            url: `${apiBase}annotation/recomb/results/`,
            params: { source: 15 },
        }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);

    // Second, specify what kind of information to display. This demo uses a pre-defined set of
    // panels with common display options.
    const layout = LocusZoom.Layouts.get('plot', 'standard_association', {
        state: {
            chr: '10',
            start: 123802119,
            end: 124202119,
        },
    });
    layout.panels[0].title = { text: name };

    // Last, draw the plot in the div for this page
    //   Using window.x ensures that a reference to the plot is available via the JS console
    //  for debugging
    window.plot = LocusZoom.populate('#lz-plot', data_sources, layout);
    window.data_sources = data_sources;
}

function addPlotPanel(name, reader, options = {}) {
    options.id_field = 'variant';
    // TODO: cleanup globals usage
    // Add a GWAS to the plot
    const namespace = `assoc_${name}`;
    window.data_sources.add(namespace, ['TabixAssociationLZ', {
        tabix_reader: reader,
        params: options,
    }]);
    const mods = {
        namespace: {
            default: namespace,
            assoc: namespace,
            ld: 'ld',
        },
        id: namespace,
        title: { text: name },
        y_index: -1,
    };
    const layout = LocusZoom.Layouts.get('panel', 'association', mods);
    window.plot.addPanel(layout);
}

// eslint-disable-next-line no-unused-vars
const app = new Vue({ render: h => h(gwasChooser) })
    .$mount('#choose-gwas');

// LocusZoom exists outside the Vue instance, and responds to controls via event listeners
app.$on('config-ready', (name, reader, options) => {
    if (!window.plot) {
        createPlot(name, reader, options);
    } else {
        addPlotPanel(name, reader, options);
    }
});

app.$on('select-range', state => window.plot.applyState(state));
