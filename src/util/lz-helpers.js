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
                    reject(new Error('Could not read requested region. This may indicate an error with the .tbi index.'));
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

/**
 * Create customized panel layout(s) that include functionality from all of the features selected.
 * @param {string} source_label
 * @param annotations
 * @param build
 * @return {*[]}
 */
function createAssocLayout(
    source_label,
    annotations = { credible_sets: false, gwas_catalog: true },
    build,
) {
    const new_panels = [];
    const source_name = sourceName(source_label);

    // Other namespaces won't be overridden; they will be reused as is.
    const namespace = {
        assoc: `assoc_${source_name}`,
        credset: `credset_${source_name}`,
        catalog: 'catalog',
    };

    const assoc_panel = LocusZoom.Layouts.get('panel', 'association', {
        id: `association_${source_name}`,
        title: { text: source_label },
        namespace,
    });
    const assoc_layer = assoc_panel.data_layers[2]; // layer 1 = recomb rate
    const assoc_tooltip = assoc_layer.tooltip;
    // FIXME LZ.js cannot handle recomb rate for build 38; remove this layer if present
    if (build === 38) {
        assoc_panel.data_layers.splice(1, 1);
    }

    const dash_extra = []; // Build Display options widget & add to dashboard iff features selected
    if (Object.values(annotations).some(item => !!item)) {
        dash_extra.push({
            type: 'display_options',
            position: 'right',
            color: 'blue',
            // Below: special config specific to this widget
            button_html: 'Display options...',
            button_title: 'Control how plot items are displayed',
            layer_name: 'associationpvalues',
            default_config_display_name: 'Default view',
            options: [],
        });
    }
    const fields_extra = [];
    if (annotations.credible_sets) {
        // Grab the options object from a pre-existing layout
        const basis = LocusZoom.Layouts.get('panel', 'association_credible_set', { namespace });
        dash_extra[0].options.push(...basis.dashboard.components.pop().options);
        fields_extra.push('{{namespace[credset]}}posterior_prob', '{{namespace[credset]}}contrib_fraction', '{{namespace[credset]}}is_member');
        assoc_tooltip.html += '<br>Posterior probability: <strong>{{{{namespace[credset]}}posterior_prob|scinotation}}</strong><br>';
    }
    if (annotations.gwas_catalog) {
        // Grab the options object from a pre-existing layout
        const basis = LocusZoom.Layouts.get('panel', 'association_catalog', { namespace });
        dash_extra[0].options.push(...basis.dashboard.components.pop().options);
        fields_extra.push('{{namespace[catalog]}}rsid', '{{namespace[catalog]}}trait', '{{namespace[catalog]}}log_pvalue');
        assoc_tooltip.html += '{{#if {{namespace[catalog]}}rsid}}<br><a href="https://www.ebi.ac.uk/gwas/search?query={{{{namespace[catalog]}}rsid}}" target="_new">See hits in GWAS catalog</a>{{/if}}';
    }
    assoc_layer.fields.push(...fields_extra);
    assoc_panel.dashboard.components.push(...dash_extra);

    // After all custom options added, run mods through Layouts.get once more to apply namespacing
    new_panels.push(LocusZoom.Layouts.get('panel', 'association', assoc_panel));
    if (annotations.gwas_catalog) {
        new_panels.push(LocusZoom.Layouts.get('panel', 'annotation_catalog', {
            id: `catalog_${source_name}`,
            namespace,
        }));
    }
    return new_panels;
}


/**
 * Add data sources and generate layouts, but don't add them to the plot
 * @private
 * @param data_sources
 * @param source_options
 * @param plot_options
 */
function preparePanels(
    data_sources,
    source_options,
    plot_options,
) {
    const { label, reader, parser_config } = source_options;

    parser_config.id_field = 'variant';
    // Add a GWAS to the plot
    const assoc_name = `assoc_${sourceName(label)}`;
    data_sources.add(assoc_name, ['TabixAssociationLZ', {
        tabix_reader: reader,
        params: parser_config,
    }]);
    // Always add a credible set source; it won't be called unless used in a layout
    data_sources.add(`credset_${sourceName(label)}`, ['CredibleSetLZ',
        { params: { fields: { log_pvalue: `${assoc_name}:log_pvalue` }, threshold: 0.95 } }]);

    return createAssocLayout(label, plot_options.annotations, plot_options.build);
}

function createPlot(
    selector,
    source_options = { label: null, reader: null, parser_config: null },
    plot_options = { annotations: {}, state: {} },
) {
    source_options.parser_config.id_field = 'variant';

    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const data_sources = new LocusZoom.DataSources();

    // Add data tracks, then make sure genes are shown on plot
    const panel_layouts = preparePanels(data_sources, source_options, plot_options);
    panel_layouts.push(LocusZoom.Layouts.get('panel', 'genes', { proportional_height: 0.5 }));
    const layout = LocusZoom.Layouts.get('plot', 'standard_association', {
        state: plot_options.state,
        panels: panel_layouts,
    });

    data_sources
        // The catalog source will be auto-determined from genome build
        .add('catalog', ['GwasCatalogLZ', { url: `${apiBase}annotation/gwascatalog/results/`, params: { source: null } }])
        .add('ld', ['LDLZ2', { url: 'https://portaldev.sph.umich.edu/ld/', params: { source: '1000G', build: 37, population: 'ALL' } }])
        .add('gene', ['GeneLZ', {
            url: `${apiBase}annotation/genes/`,
            params: { source: 2 },
        }])
        .add('recomb', ['RecombLZ', {
            url: `${apiBase}annotation/recomb/results/`,
            params: { source: 15 },
        }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);

    // Last, draw the plot in the div for this page
    const plot = LocusZoom.populate(selector, data_sources, layout);
    return [plot, data_sources];
}

function addPanels(plot, data_sources, source_options, plot_options) {
    const layout = preparePanels(data_sources, source_options, plot_options);
    layout.forEach((panel) => {
        panel.y_index = -1; // Make sure genes track is always the last one
        plot.addPanel(panel);
    });
}

export { createPlot, sourceName, addPanels };
