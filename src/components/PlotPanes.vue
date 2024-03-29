<script>
/**
 * Show a group of interconnected plots and export tables, for the provided data
 */
import { BCard, BTab, BTabs } from 'bootstrap-vue/src/';

import ExportData from './ExportData.vue';
import LzPlot from './LzPlot.vue';
import PhewasMaker from './PhewasMaker.vue';

// Named constants that map to the order (index) of tabs as declared in the template for this component
const TABS = Object.freeze({PLOT: 0, PHEWAS: 1, EXPORT: 2});

export default {
    name: 'PlotPanes',
    components: {
        ExportData,
        LzPlot,
        PhewasMaker,
        BCard,
        BTab,
        BTabs,
    },
    props: {
        base_layout: { type: Object, default: () => ({}) },
        base_sources: { type: Array, default: () => [] },
        known_tracks: { type: Array, default: () => [] },

        // Basic plot/ region
        chr: { type: String, default: null },
        start: { type: Number, default: null },
        end: { type: Number, default: null },
        genome_build: { type: String, default: 'GRCh37' },

        // Control optional features (this could be done more nicely)
        dynamic_urls: { type: Boolean, default: false }, // Change URL when plot updates
    },
    data() {
        return {
            selected_tab: 0,

            // For the "phewas plot" label:
            tmp_phewas_study: null,
            tmp_phewas_variant: null,
            tmp_phewas_logpvalue: null,

            // Required for export widget
            tmp_export_callback: null,
            table_data: [],
        };
    },
    computed: {
        allow_phewas() {
            // Our current phewas api only has build 37 datasets; disable option for build 38
            return this.genome_build === 'GRCh37';
        },
        has_studies() {
            return !!this.known_tracks.length;
        },
    },
    beforeCreate() {
        this.TABS = TABS;
        this.has_plot = false;
    },
    methods: {
        receivePlot() {
            this.has_plot = true;
            this.$emit('plot-created');
        },
        addStudy(panel_configs, source_configs) {
            // Add a study to the plot
            this.$refs.assoc_plot.addPanels(panel_configs, source_configs);
        },
        onVariantClick(lzEvent) {
            // Respond to clicking on an association plot datapoint
            const panel_name = lzEvent.sourceID;
            if (panel_name.indexOf('association_') === -1) {
                return;
            }

            // TODO: Clean this up a bit to better match original display name
            const variant_data = lzEvent.data;
            // Internally, LZ broadcasts `plotname.assoc_study`. Convert to `study` for display
            this.tmp_phewas_study = panel_name.split('.')[1].replace(/^association_/, '');
            this.tmp_phewas_variant = variant_data['assoc:variant'];
            this.tmp_phewas_logpvalue = variant_data['assoc:log_pvalue'];
        },

        subscribeToData(layer_name) {
            // This method controls one table widget that draws data from one set of plot fields
            if (this.tmp_export_callback) {
                this.$refs.assoc_plot.callPlot((plot) => plot.off('data_from_layer', this.tmp_export_callback));
                this.tmp_export_callback = null;
            }
            if (!layer_name || !this.has_plot) {
                this.table_data = [];
                return;
            }
            this.tmp_export_callback = this.$refs.assoc_plot.callPlot((plot) => {
                return plot.subscribeToData({ from_layer: layer_name }, (data) => this.table_data = data);
            });
            // In this use case, the plot already has data; make sure it feeds data to the table
            // immediately
            this.$refs.assoc_plot.callPlot((plot) => plot.applyState());
        },
    },
};
</script>

<template>
  <div>
    <b-card no-body>
      <b-tabs
        v-model="selected_tab"
        pills
        card
        vertical
        style="min-height:1000px;"
        class="flex-nowrap"
        content-class="scroll-extra"
      >
        <b-tab
          :active="selected_tab === TABS.PLOT"
          title="GWAS"
        >
          <lz-plot
            v-if="has_studies"
            ref="assoc_plot"
            :show_loading="true"
            :base_layout="base_layout"
            :base_sources="base_sources"
            :chr="chr"
            :start="start"
            :end="end"
            :dynamic_urls="dynamic_urls"
            @element_clicked="onVariantClick"
            @connected="receivePlot" />
          <div
            v-else
            class="placeholder-plot"
            style="display:table;">
            <span
              class="text-center"
              style="display: table-cell; vertical-align:middle">
              Please add data from a tabix file to continue
            </span>
          </div>
        </b-tab>
        <b-tab
          :active="selected_tab === TABS.PHEWAS"
          :disabled="!has_studies || !allow_phewas"
        >
          <template slot="title">
            <span title="Only available for build GRCh37 datasets">PheWAS</span>
          </template>
          <phewas-maker
            ref="phewas"
            :variant_name="tmp_phewas_variant"
            :genome_build="genome_build"
            :your_study="tmp_phewas_study"
            :your_logpvalue="tmp_phewas_logpvalue"
            :allow_render="selected_tab === TABS.PHEWAS"/>
        </b-tab>
        <b-tab
          :active="selected_tab === TABS.EXPORT"
          :disabled="!has_studies"
          title="Export">
          <export-data
            :known_tracks="known_tracks"
            :table_data="table_data"
            @requested-data="subscribeToData"/>
        </b-tab>

      </b-tabs>
    </b-card>
  </div>
</template>


<style>
  .placeholder-plot {
    width: 100%;
    height: 500px;
    border-style: dotted;
  }
  .scroll-extra {
    overflow-x: scroll;
  }
</style>
