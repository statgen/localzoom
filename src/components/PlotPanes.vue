<script>
/**
 * Show a group of interconnected plots and export tables, for the provided data
 */
import { BCard, BTab, BTabs } from 'bootstrap-vue/esm/';

import ExportData from './ExportData.vue';
import LzPlot from './LzPlot.vue';
import PhewasMaker from './PhewasMaker.vue';

import { deNamespace } from '../util/lz-helpers';

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
        assoc_layout: { type: Object, default: () => ({}) },
        assoc_sources: { type: Array, default: () => [] },
        study_names: { type: Array, default: () => [] }, // TODO: array --> label/id pairs?

        // Basic plot/ region
        chr: { type: String, default: null },
        start: { type: Number, default: null },
        end: { type: Number, default: null },
        build: { type: String, default: 'GRCh37' },

        // Control optional features (this could be done more nicely)
        dynamic_urls: { type: Boolean, default: false }, // Change URL when plot updates
        has_credible_sets: { type: Boolean, default: true }, // export tool
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
            return this.build === 'GRCh37';
        },
        has_studies() {
            return !!this.study_names.length;
        },
    },
    beforeCreate() {
        // Preserve a reference to component widgets so that their methods can be accessed directly
        //  Some- esp LZ plots- behave very oddly when wrapped as a nested observable; we can
        //  bypass these problems by assigning them as static properties instead of nested
        //  observables.
        this.PHEWAS_TAB = 1;
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
            const variant_data = deNamespace(lzEvent.data, 'assoc');
            // Internally, LZ broadcasts `plotname.assoc_study`. Convert to `study` for display
            this.tmp_phewas_study = panel_name.split('.')[1].replace(/^association_/, '');
            this.tmp_phewas_variant = variant_data.variant;
            this.tmp_phewas_logpvalue = variant_data.log_pvalue;
        },
        subscribeFields(fields) {
            // This method controls one table widget that draws data from one set of plot fields
            if (this.tmp_export_callback) {
                this.$refs.assoc_plot.callPlot((plot) => plot.off('data_rendered', this.tmp_export_callback));
                this.tmp_export_callback = null;
            }
            if (!fields.length || !this.has_plot) {
                return;
            }
            this.tmp_export_callback = this.$refs.assoc_plot.callPlot((plot) => {
                plot.subscribeToData(fields, (data) => {
                    this.table_data = data.map((item) => deNamespace(item, 'assoc'));
                });
            });
            // In this use case, the plot already has data; make sure it feeds data to the table
            // immediately
            this.$refs.assoc_plot.callPlot((plot) => plot.emit('data_rendered'));
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
        <b-tab title="GWAS">
          <lz-plot
            v-if="has_studies"
            ref="assoc_plot"
            :show_loading="true"
            :base_layout="assoc_layout"
            :base_sources="assoc_sources"
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
              Please add a GWAS track to continue
            </span>
          </div>
        </b-tab>
        <b-tab :disabled="!has_studies || !allow_phewas">
          <template slot="title">
            <span title="Only available for build GRCh37 datasets">PheWAS</span>
          </template>
          <phewas-maker
            :variant_name="tmp_phewas_variant"
            :build="build"
            :your_study="tmp_phewas_study"
            :your_logpvalue="tmp_phewas_logpvalue"
            :allow_render="selected_tab === PHEWAS_TAB"/>
        </b-tab>
        <b-tab
          :disabled="!has_studies"
          title="Export">
          <export-data
            :has_credible_sets="has_credible_sets"
            :study_names="study_names"
            :table_data="table_data"
            @requested-data="subscribeFields"/>
        </b-tab>

      </b-tabs>
    </b-card>
  </div>
</template>


<style>
  .placeholder-plot {
    width: 100%;
    height: 500px;
    border-style: dashed;
  }
  .scroll-extra {
    overflow-x: scroll;
  }
</style>
