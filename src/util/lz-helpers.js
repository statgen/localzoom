import LocusZoom from 'locuszoom';
import 'locuszoom/dist/ext/lz-credible-sets.min'; // Import for side effects (globally register helpers)

import { PORTAL_API_BASE_URL, LD_SERVER_BASE_URL, PORTAL_DEV_API_BASE_URL } from './constants';
import { makeParser } from '../gwas/parsers';

const stateUrlMapping = Object.freeze({ chr: 'chrom', start: 'start', end: 'end' });

LocusZoom.KnownDataSources.extend('AssociationLZ', 'TabixAssociationLZ', {
    parseInit(init) {
        this.params = init.params; // delimiter, marker_col, pval_col, is_log_pval
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
        // Some GWAS files will include variant rows, even if no pvalue can be calculated.
        // Eg, EPACTS fills in "NA" for pvalue in this case. These rows are not useful for a
        // scatter plot, and this data source should ignore them.
        return data.map(this.parser).filter(item => !Number.isNaN(item.log_pvalue));
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
 * Create customized panel layout(s) for a single association study, with functionality from all
 *   of the features selected.
 * @param {string} source_label
 * @param annotations
 * @param build
 * @return {*[]}
 */
function createStudyLayout(
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
 * Create all the datasources needed to plot a specific study, from Tabixed data
 * @return Array Return an array of [name, source_config] entries
 */
function createStudyTabixSources(label, tabix_reader, parser_options) {
    const assoc_name = `assoc_${sourceName(label)}`;
    const source_params = { ...parser_options, id_field: 'variant' };
    return [
        [assoc_name, ['TabixAssociationLZ', { tabix_reader, params: source_params }]],
        [ // Always add a credible set source; it won't be called unless used in a layout
            `credset_${sourceName(label)}`, [
                'CredibleSetLZ',
                { params: { fields: { log_pvalue: `${assoc_name}:log_pvalue` }, threshold: 0.95 } },
            ],
        ],
    ];
}

function addPanels(plot, data_sources, panel_options, source_options) {
    source_options.forEach(source => data_sources.add(...source));
    panel_options.forEach((panel_layout) => {
        panel_layout.y_index = -1; // Make sure genes track is always the last one
        const panel = plot.addPanel(panel_layout);
        panel.addBasicLoader();
    });
}

/**
 * Get configuration for the set of common, non-study-specific datasources used by the plot.
 * Can optionally prepend study-specific sources for convenience when first creating the plot
 */
function getBasicSources(study_sources = []) {
    return [
        ...study_sources,
        ['catalog', ['GwasCatalogLZ', { url: `${PORTAL_API_BASE_URL}annotation/gwascatalog/results/` }]],
        ['ld', ['LDLZ2', { url: LD_SERVER_BASE_URL, params: { source: '1000G', population: 'ALL' } }]],
        ['gene', ['GeneLZ', { url: `${PORTAL_API_BASE_URL}annotation/genes/` }]],
        ['recomb', ['RecombLZ', { url: `${PORTAL_DEV_API_BASE_URL}annotation/recomb/results/` }]],
        // TODO: This source is broken on https; I wish we had an alternative
        ['constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]],
    ];
}

function getBasicLayout(initial_state = {}, study_panels = [], mods = {}) {
    const panels = [
        ...study_panels,
        LocusZoom.Layouts.get('panel', 'genes', { proportional_height: 0.5 }),
    ];

    const extra = Object.assign({
        state: initial_state,
        panels,
    }, mods);
    return LocusZoom.Layouts.get('plot', 'standard_association', extra);
}

/**
 * Remove the `sourcename:` prefix from field names in the data returned by an LZ datasource
 *
 * This is a convenience method for writing external widgets (like tables) that subscribe to the
 *   plot; typically we don't want to have to redefine the table layout every time someone selects
 *   a different association study.
 * As with all convenience methods, it has limits: don't use it if the same field name is requested
 *   from two different sources!
 * @param {Object} data An object representing the fields for one row of data
 * @param {String} [prefer] Sometimes, two sources provide a field with same name. Specify which
 *  source will take precedence in the event of a conflict.
 */
function deNamespace(data, prefer) {
    return Object.keys(data).reduce((acc, key) => {
        const new_key = key.replace(/.*?:/, '');
        if (!Object.prototype.hasOwnProperty.call(acc, new_key)
            || (!prefer || key.startsWith(prefer))) {
            acc[new_key] = data[key];
        }
        return acc;
    }, {});
}

export {
    // Basic definitions
    getBasicSources, getBasicLayout,
    createStudyTabixSources, createStudyLayout,
    // Plot manipulation
    sourceName, addPanels,
    // General helpers
    deNamespace,
    // Constants
    stateUrlMapping,
};
