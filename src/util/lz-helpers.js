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


const localzoom_assoc_layer = function () {
    const assoc_tooltip = LocusZoom.Layouts.get('tooltip', 'standard_association_with_label');
    assoc_tooltip.html += `{{#if assoc:beta|is_numeric}}<br>&beta;: <strong>{{assoc:beta|scinotation|htmlescape}}</strong>{{/if}}
{{#if assoc:stderr_beta|is_numeric}}<br>SE (&beta;): <strong>{{assoc:stderr_beta|scinotation|htmlescape}}</strong>{{/if}}
{{#if assoc:alt_allele_freq|is_numeric}}<br>Alt. freq: <strong>{{assoc:alt_allele_freq|scinotation|htmlescape}} </strong>{{/if}}
{{#if assoc:rsid}}<br>rsID: <a href="https://www.ncbi.nlm.nih.gov/snp/{{assoc:rsid|htmlescape}}" target="_blank" rel="noopener">{{assoc:rsid|htmlescape}}</a>{{/if}}
{{#if credset:posterior_prob}}<br>Posterior probability: <strong>{{credset:posterior_prob|scinotation}}{{/if}}</strong><br>

{{#if catalog:rsid}}<br><a href="https://www.ebi.ac.uk/gwas/search?query={{catalog:rsid}}" target="_new">See hits in GWAS catalog</a>{{/if}}`;

    return LocusZoom.Layouts.get('data_layer', 'association_pvalues', {
        namespace: { catalog: 'catalog', credset: 'credset' },
        data_operations: [
            // This combines many pieces of data into a single cohesive set of records
            // NOTE: The credset adapter is a legacy item and it is a bit weird
            {
                type: 'fetch',
                from: ['assoc', 'catalog', 'credset(assoc)', 'ld(credset)'],
            },
            {
                name: 'assoc_credset_catalog',
                type: 'assoc_to_gwas_catalog',
                requires: ['credset', 'catalog'],
                params: ['assoc:position', 'catalog:pos', 'catalog:log_pvalue'],
            },
            {
                name: 'credset_plus_ld',
                type: 'left_match',
                requires: ['assoc_credset_catalog', 'ld'],
                params: ['assoc:position', 'ld:position2'],
            },
        ],
        tooltip: assoc_tooltip,
        label: {
            text: '{{#if assoc:rsid}}{{assoc:rsid}}{{#else}}{{assoc:variant}}{{/if}}',
            spacing: 12,
            lines: { style: { 'stroke-width': '2px', stroke: '#333333', 'stroke-dasharray': '2px 2px' } },
            filters: [
                { field: 'lz_show_label', operator: '=', value: true },
            ],
            style: { 'font-weight': 'bold' },
        },
    });
}();


// Register reusable rendering options for LocalZoom association tracks (a set of combined custom features)
LocusZoom.Layouts.add('data_layer', 'localzoom_assoc', localzoom_assoc_layer);

const localzoom_assoc_panel = function () {
    // LocalZoom renders an association track with several annotations that are not combined anywhere else; we define a custom track
    const base = LocusZoom.Layouts.get('panel', 'association', {
        height: 300,
        data_layers: [
            LocusZoom.Layouts.get('data_layer', 'significance'),
            LocusZoom.Layouts.get('data_layer', 'recomb_rate'),
            LocusZoom.Layouts.get('data_layer', 'localzoom_assoc'),
        ],
    });
    // Add display options for catalog + credsets
    base.toolbar.widgets.push({
        type: 'display_options',
        custom_event_name: 'widget_association_display_options_choice',
        position: 'right',
        color: 'blue',
        // Below: special config specific to this widget
        button_html: 'Display options...',
        button_title: 'Control how plot items are displayed',
        layer_name: 'associationpvalues',
        default_config_display_name: 'Default view',
        options: [
            {
                // First dropdown menu item
                display_name: '95% credible set (boolean)',  // Human readable representation of field name
                display: {  // Specify layout directives that control display of the plot for this option
                    point_shape: 'circle',
                    point_size: 40,
                    color: {
                        field: 'credset:is_member',
                        scale_function: 'if',
                        parameters: {
                            field_value: true,
                            then: '#00CC00',
                            else: '#CCCCCC',
                        },
                    },
                    legend: [ // Tells the legend how to represent this display option
                        {
                            shape: 'circle',
                            color: '#00CC00',
                            size: 40,
                            label: 'In credible set',
                            class: 'lz-data_layer-scatter',
                        },
                        {
                            shape: 'circle',
                            color: '#CCCCCC',
                            size: 40,
                            label: 'Not in credible set',
                            class: 'lz-data_layer-scatter',
                        },
                    ],
                },
            },
            {
                display_name: '95% credible set (gradient by contribution)',
                display: {
                    point_shape: 'circle',
                    point_size: 40,
                    color: [
                        {
                            field: 'credset:contrib_fraction',
                            scale_function: 'if',
                            parameters: {
                                field_value: 0,
                                then: '#777777',
                            },
                        },
                        {
                            scale_function: 'interpolate',
                            field: 'credset:contrib_fraction',
                            parameters: {
                                breaks: [0, 1],
                                values: ['#fafe87', '#9c0000'],
                            },
                        },
                    ],
                    legend: [
                        {
                            shape: 'circle',
                            color: '#777777',
                            size: 40,
                            label: 'No contribution',
                            class: 'lz-data_layer-scatter',
                        },
                        {
                            shape: 'circle',
                            color: '#fafe87',
                            size: 40,
                            label: 'Some contribution',
                            class: 'lz-data_layer-scatter',
                        },
                        {
                            shape: 'circle',
                            color: '#9c0000',
                            size: 40,
                            label: 'Most contribution',
                            class: 'lz-data_layer-scatter',
                        },
                    ],
                },
            },
            {
                display_name: 'Label catalog traits',
                display: {  // Specify layout directives that control display of the plot for this option
                    label: {
                        text: '{{catalog:trait}}',
                        spacing: 6,
                        lines: {
                            style: {
                                'stroke-width': '2px',
                                'stroke': '#333333',
                                'stroke-dasharray': '2px 2px',
                            },
                        },
                        filters: [
                            // Only label points if they are significant for some trait in the catalog, AND in high LD
                            //  with the top hit of interest
                            { field: 'catalog:trait', operator: '!=', value: null },
                            { field: 'catalog:log_pvalue', operator: '>', value: 7.301 },
                            { field: 'ld:correlation', operator: '>', value: 0.4 },
                        ],
                        style: {
                            'font-size': '12px',
                            'font-weight': 'bold',
                            'fill': '#333333',
                        },
                    },
                },
            },
        ],
    });
    // LocalZoom field names are slightly more verbose than the PortalDev API; rename this field so everything works
    LocusZoom.Layouts.renameField(base, 'assoc:se', 'assoc:stderr_beta', false);
    return base;
}();

LocusZoom.Layouts.add('panel', 'localzoom_assoc', localzoom_assoc_panel);

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
 * @return {*[]}
 */
function createGwasStudyLayout(
    track_id,
    display_name,
) {

    // Override the dataset-specific namespaces, so that each layer knows how to find data
    const namespace = { assoc: `assoc_${track_id}`, credset: `credset_${track_id}` };

    return [
        LocusZoom.Layouts.get('panel', 'localzoom_assoc', {
            id: `association_${track_id}`,
            namespace,
            title: { text: display_name },
        }),
        LocusZoom.Layouts.get('panel', 'annotation_catalog', {
            id: `catalog_${track_id}`,
            namespace,
            title: {
                text: `GWAS Catalog hits for ${display_name}`,
                style: { 'font-size': '14px' },
                x: 50,
            },
        }),
    ];
}

/**
 * Create an appropriate layout based on datatype
 */
function createStudyLayouts (data_type, filename, display_name) {
    const track_id = `${data_type}_${sourceName(filename)}`;

    if (data_type === DATA_TYPES.GWAS) {
        return createGwasStudyLayout(track_id, display_name);
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
            // We are overriding LD in-place, not naming the source instance dynamically based on filename
            // Replacing the source completely removes what could otherwise be a big unused cache object, and makes it simpler to add new tracks with a stock layout
            ['ld', ['UserTabixLD', {reader: tabix_reader, parser_func }]],
        ];
    } else {
        throw new Error('Unrecognized datatype');
    }
}


function addPanels(plot, data_sources, panel_options, source_options) {
    source_options.forEach(([name, options]) => {
        // If the same name is encountered twice, the new item will override.
        // Elsewhere in this app, we also check if an item is duplicated and warn the user, so this shouldn't result in files being replaced.
        // Relaxing the constraint internally allows us to override things like LD with a new source of exactly the same name
        // TODO: Make more selective after lz-plot is rewritten to be more generic
        data_sources.add(name, options, true);
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
function activateUserLD(plot, display_name) {
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
        // Awkward API wart- dynamic toolbar needs to modify toolbar in two ways
        plot.layout.toolbar.widgets.push(config);
        widget = plot.toolbar.addWidget(config);
    }
    // Update the UI help button EVERY time user LD is added, eg let user swap out LD to a different file when they switch regions
    //  (I'd RATHER they provide LD into all one file for regions, while still being a small file. But let's expect the most kludgy workflows to win)
    const caption = `This plot is being rendered with user-provided LD. The filename is: <b>${escape(display_name)}</b>`;
    LocusZoom.Layouts.mutate_attrs(plot.layout, '$..widgets[?(@.tag === "user_ld_description")].menu_html', caption);
    widget.show();

    // Since the LD is swapped out, we need to tell the plot to re-parse data config (LZ caches datasource options until told not to)
    // Also, Update any UI captions / toolbar widgets
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
