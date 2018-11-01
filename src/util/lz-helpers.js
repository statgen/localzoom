/* global LocusZoom */
import makeParser from './parsers';

LocusZoom.KnownDataSources.extend('AssociationLZ', 'TabixAssociationLZ', {
    parseInit(init) {
        this.params = init.params; // delimiter, marker_col, pval_col, is_log_p
        this.parser = makeParser(this.params);
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
        return data.map(this.parser);
    },
});

/**
 * A source name cannot contain special characters (this would break the layout)
 *
 * @param {string} display_name
 * @return {string}
 */
function sourceName(display_name) {
    return display_name.replace(/[^A-Za-z0-9_]/g, '_');
}

function createPlot(
    selector,
    name,
    reader,
    source_options = {},
    plot_options = { credible_sets: false, gwas_catalog: true },
) {
    source_options.id_field = 'variant';

    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const data_sources = new LocusZoom.DataSources()
        .add('assoc', ['TabixAssociationLZ', {
            tabix_reader: reader,
            params: source_options,
        }])
        .add('credset', ['CredibleSetLZ',
            { params: { fields: { log_pvalue: 'assoc:log_pvalue' }, threshold: 0.95 } }])
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
    const plot = LocusZoom.populate(selector, data_sources, layout);
    return [plot, data_sources];
}

function addPlotPanel(plot, data_sources, name, reader, options = {}) {
    options.id_field = 'variant';
    // Add a GWAS to the plot
    const namespace = `assoc_${sourceName(name)}`;
    data_sources.add(namespace, ['TabixAssociationLZ', {
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
    plot.addPanel(layout);
}

export { createPlot, addPlotPanel, sourceName };
