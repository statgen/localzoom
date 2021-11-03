import escape from 'lodash/escape';
import LocusZoom from 'locuszoom';
import credibleSets from 'locuszoom/esm/ext/lz-credible-sets';
import tabixSource from 'locuszoom/esm/ext/lz-tabix-source';
import intervalTracks from 'locuszoom/esm/ext/lz-intervals-track';
import lzParsers from 'locuszoom/esm/ext/lz-parsers';

import { PORTAL_API_BASE_URL, LD_SERVER_BASE_URL, DATA_TYPES } from './constants';

LocusZoom.use(credibleSets);
LocusZoom.use(tabixSource);
LocusZoom.use(intervalTracks);
LocusZoom.use(lzParsers);

const stateUrlMapping = Object.freeze({ chr: 'chrom', start: 'start', end: 'end', ldrefvar: 'ld_variant' });

const TabixUrlSource = LocusZoom.Adapters.get('TabixUrlSource');
class TabixAssociationLZ extends TabixUrlSource {
    _annotateRecords(records) {
        // Some GWAS files will include variant rows, even if no pvalue can be calculated.
        // Eg, EPACTS fills in "NA" for pvalue in this case. These rows are not useful for a
        // scatter plot, and this data source should ignore them.
        return records.filter((item) => !Number.isNaN(item['log_pvalue']));
    }
}

LocusZoom.Adapters.add('TabixAssociationLZ', TabixAssociationLZ);

/**
 * A source name cannot contain special characters (this would break the layout)
 *
 * @param {string} display_name
 * @return {string}
 */
function sourceName(display_name) {
    // FIXME: incorporate datatype when generating source name; fix various caller locations
    return display_name.replace(/[^A-Za-z0-9_]/g, '_');
}

/**
 * Create customized panel layout(s) for a single association study, with functionality from all
 *   of the features selected.
 * @param {string} track_id Internal track ID, expected to be unique across the entire plot.
 * @param {string} display_name
 * @param annotations
 * @return {*[]}
 */
function createGwasStudyLayout(
    track_id,
    display_name,
    annotations = { has_credible_sets: false, has_gwas_catalog: true },
) {
    const new_panels = [];

    // Other namespaces won't be overridden; they will be reused as is.
    const namespace = {
        assoc: `assoc_${track_id}`,
    };

    const assoc_panel = LocusZoom.Layouts.get('panel', 'association', {
        id: `association_${track_id}`,
        title: { text: display_name },
        height: 275,
        namespace,
    });
    const assoc_layer = assoc_panel.data_layers[2]; // layer 1 = recomb rate
    assoc_layer.label = {
        text: '{{#if assoc:rsid}}{{assoc:rsid}}{{#else}}{{assoc:variant}}{{/if}}',
        spacing: 12,
        lines: { style: { 'stroke-width': '2px', stroke: '#333333', 'stroke-dasharray': '2px 2px' } },
        filters: [
            { field: 'lz_show_label', operator: '=', value: true },
        ],
        style: { 'font-weight': 'bold' },
    };
    assoc_layer.tooltip = LocusZoom.Layouts.get('tooltip', 'standard_association_with_label');
    const assoc_tooltip = assoc_layer.tooltip;

    assoc_tooltip.html += `{{#if assoc:beta|is_numeric}}<br>&beta;: <strong>{{assoc:beta|scinotation|htmlescape}}</strong>{{/if}}
{{#if assoc:stderr_beta|is_numeric}}<br>SE (&beta;): <strong>{{assoc:stderr_beta|scinotation|htmlescape}}</strong>{{/if}}
{{#if assoc:alt_allele_freq|is_numeric}}<br>Alt. freq: <strong>{{assoc:alt_allele_freq|scinotation|htmlescape}} </strong>{{/if}}
{{#if assoc:rsid}}<br>rsID: <a href="https://www.ncbi.nlm.nih.gov/snp/{{assoc:rsid|htmlescape}}" target="_blank" rel="noopener">{{assoc:rsid|htmlescape}}</a>{{/if}}`;

    const dash_extra = []; // Build Display options widget & add to toolbar iff features selected
    if (Object.values(annotations).some((item) => !!item)) {
        dash_extra.push({
            type: 'display_options',
            custom_event_name: 'widget_association_display_options_choice',
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
    if (annotations.has_credible_sets) {
        // Grab the options object from a pre-existing layout
        const basis = LocusZoom.Layouts.get('panel', 'association_credible_set', { namespace });
        dash_extra[0].options.push(...basis.toolbar.widgets.pop().options);
        assoc_tooltip.html += '{{#if credset:posterior_prob}}<br>Posterior probability: <strong>{{credset:posterior_prob|scinotation}}{{/if}}</strong><br>';
        // Tell the layer to fetch the extra data
        assoc_layer.namespace.credset = `credset_${track_id}`;
        LocusZoom.Layouts.mutate_attrs(assoc_layer, '$..data_operations[?(@.type === "fetch")].from', (old) => old.concat('credset(assoc)'));
    }
    if (annotations.has_gwas_catalog) {
        assoc_layer.data_operations.push({
            type: 'assoc_to_gwas_catalog',
            name: 'assoc_catalog',
            requires: ['assoc_plus_ld', 'catalog'],
            params: ['assoc:position', 'catalog:pos', 'catalog:log_pvalue'],
        });

        // Grab the options object from a pre-existing layout, and add it to the dropdown menu
        const basis = LocusZoom.Layouts.get('panel', 'association_catalog');
        dash_extra[0].options.push(...basis.toolbar.widgets.pop().options);
        assoc_tooltip.html += '{{#if catalog:rsid}}<br><a href="https://www.ebi.ac.uk/gwas/search?query={{catalog:rsid}}" target="_new">See hits in GWAS catalog</a>{{/if}}';

        // Tell this layer how to fetch the extra data required
        assoc_layer.namespace.catalog = 'catalog';
        LocusZoom.Layouts.mutate_attrs(assoc_layer, '$..data_operations[?(@.type === "fetch")].from', (old) => old.concat('catalog'));
    }
    assoc_panel.toolbar.widgets.push(...dash_extra);

    // After all custom options added, run mods through Layouts.get once more to apply namespacing
    new_panels.push(assoc_panel);
    if (annotations.has_gwas_catalog) {
        new_panels.push(LocusZoom.Layouts.get('panel', 'annotation_catalog', {
            id: `catalog_${track_id}`,
            namespace,
            title: {
                text: `GWAS Catalog hits for ${display_name}`,
                style: { 'font-size': '14px' },
                x: 50,
            },
        }));
    }
    return new_panels;
}

/**
 * Create an appropriate layout based on datatype
 */
function createStudyLayouts (data_type, filename, display_name, annotations) {
    const track_id = `${data_type}_${sourceName(filename)}`;

    if (data_type === DATA_TYPES.GWAS) {
        return createGwasStudyLayout(track_id, display_name, annotations);
    } else if (data_type === DATA_TYPES.BED) {
        return [
            LocusZoom.Layouts.get('panel', 'bed_intervals', {
                id: track_id,
                namespace: { intervals: track_id },
                title: { text: display_name },
            }),
        ];
    } else if (data_type === DATA_TYPES.PLINK_LD) {
        // PLINK LD is overlaid onto the plot, but not shown as its own panel
        return [];
    } else {
        throw new Error('Unrecognized datatype');
    }
}

/**
 * Create all the datasources needed to plot a specific assoc study, including study-specific annotations
 * @return Array Return an array of [name, source_config] entries
 */
function createGwasTabixSources(track_id, tabix_reader, parser_func) {
    const assoc_name = `assoc_${track_id}`;
    return [
        [assoc_name, ['TabixAssociationLZ', { reader: tabix_reader, parser_func }]],
        [ // Always add a credible set source; it won't be called unless used in a layout
            `credset_${track_id}`, ['CredibleSetLZ', { threshold: 0.95 }],
        ],
    ];
}

/**
 * Create appropriate LocusZoom sources for the study of interest
 * @param data_type
 * @param filename  A unique track identifier (typically the filename). Used to construct the internal datasource ID name.
 * @param tabix_reader
 * @param parser_func
 * @returns {[[string, [string, {reader: *, parser_func: function(string)}]], [string, [string, {threshold: number}]]]|(string|[string, {reader, parser_func: ((function(*): {blockCount: *, score: *, chromStart: *, thickStart: *, chromEnd: *, strand: *, blockSizes: *, name: *, itemRgb: *, blockStarts: *, thickEnd: *, chrom: *})|*)}])[]}
 */
function createStudySources(data_type, tabix_reader, filename, parser_func) {
    // todo rename to GET from CREATE, for consistency
    const track_id = `${data_type}_${sourceName(filename)}`;
    if (data_type === DATA_TYPES.GWAS) {
        return createGwasTabixSources(track_id, tabix_reader, parser_func);
    } else if (data_type === DATA_TYPES.BED) {
        return [
            [track_id, ['TabixUrlSource', {reader: tabix_reader, parser_func }]],
        ];
    } else if (data_type === DATA_TYPES.PLINK_LD) {
        return [
            [track_id, ['UserTabixLD', {reader: tabix_reader, parser_func }]],
        ];
    } else {
        throw new Error('Unrecognized datatype');
    }
}


function addPanels(plot, data_sources, panel_options, source_options) {
    source_options.forEach(([name, options]) => {
        if (!data_sources.has(name)) {
            data_sources.add(name, options);
        }
    });
    panel_options.forEach((panel_layout) => {
        panel_layout.y_index = -1; // Make sure genes track is always the last one
        plot.addPanel(panel_layout);
    });
}

/**
 * Get configuration for the set of common, non-study-specific datasources used by the plot.
 * Can optionally prepend study-specific sources for convenience when first creating the plot
 */
function getBasicSources(study_sources = []) {
    return [
        ...study_sources,
        // Used by GWAS scatter plots
        ['recomb', ['RecombLZ', { url: `${PORTAL_API_BASE_URL}annotation/recomb/results/` }]],
        ['catalog', ['GwasCatalogLZ', { url: `${PORTAL_API_BASE_URL}annotation/gwascatalog/results/` }]],
        ['ld', ['LDLZ2', { url: LD_SERVER_BASE_URL, source: '1000G', population: 'ALL' }]],
        // Genes track
        ['gene', ['GeneLZ', { url: `${PORTAL_API_BASE_URL}annotation/genes/` }]],
        ['constraint', ['GeneConstraintLZ', { url: 'https://gnomad.broadinstitute.org/api/' }]],
    ];
}

function getBasicLayout(initial_state = {}, study_panels = [], mods = {}) {
    const panels = [
        ...study_panels,
        LocusZoom.Layouts.get('panel', 'genes'),
    ];

    const extra = Object.assign({
        state: initial_state,
        panels,
    }, mods);
    return LocusZoom.Layouts.get('plot', 'standard_association', extra);
}

/**
 * When user LD is received, update the plot (irreversibly) to activate custom LD features
 * 1. Remove the 1000G "ld pop" toolbar button (because those pops aren't relevant for user provided LD)
 * 2. Add a new toolbar button describing the study
 * 3. Tell the plot to use the new LD datasource when rendering anything that uses ld
 * @param {LocusZoom.Plot} plot A reference to the LZ plot instance
 * @param {String} display_name Display name
 */
function activateUserLD(plot, display_name, source_id) {
    const widgets = plot.toolbar.widgets;
    // Remove the old ld_population toolbar widget if present
    const ld_pop_index = widgets.findIndex((item) => item.layout.tag === 'ld_population');
    if (ld_pop_index !== -1) {
        const ld_widget = widgets[ld_pop_index];
        ld_widget.destroy();
        widgets.splice(ld_pop_index, 1);
        plot.toolbar.update();
    }

    // Add an LD description if not present
    const ld_desc_index = widgets.findIndex((item) => item.layout.tag === 'user_ld_description');
    let widget;
    if (ld_desc_index !== -1) {
        widget = widgets[ld_desc_index];
    } else {
        const config = {
            tag: 'user_ld_description',
            type: 'menu',
            color: 'blue',
            position: 'right',
            button_html: 'USER LD',
            menu_html: '',
        };
        // Awkward API wart!
        plot.layout.toolbar.widgets.push(config);
        widget = plot.toolbar.addWidget(config);
    }
    // Update the UI help button EVERY time user LD is added, eg let user swap out LD to a different file when they switch regions
    //  (I'd RATHER they provide LD into all one file for regions, while still being a small file. But let's expect the most kludgy workflows to win)
    const caption = `This plot is being rendered with user-provided LD. The filename is: <b>${escape(display_name)}</b>`;
    LocusZoom.Layouts.mutate_attrs(plot.layout, '$..widgets[?(@.tag === "user_ld_description")].menu_html', caption);
    widget.show();

    // Tell the plot to use different data as the source of LD info. Update any UI captions
    LocusZoom.Layouts.mutate_attrs(plot.layout, '$..namespace.ld', source_id);
    plot.mutateLayout();
    plot.toolbar.update();
    // Re-render with the new data
    plot.applyState();
}

export {
    // Basic definitions
    getBasicSources, getBasicLayout,
    createStudySources, createStudyLayouts,
    // Plot manipulation
    sourceName, activateUserLD, addPanels,
    // Constants
    stateUrlMapping,
};
