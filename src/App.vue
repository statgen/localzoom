<script>
import bsCard from 'bootstrap-vue/es/components/card/card';
import bsCollapse from 'bootstrap-vue/es/components/collapse/collapse';
import bsNav from 'bootstrap-vue/es/components/nav/nav';
import bsNavItem from 'bootstrap-vue/es/components/nav/nav-item';
import bsTab from 'bootstrap-vue/es/components/tabs/tab';
import bsTabs from 'bootstrap-vue/es/components/tabs/tabs';
import bsToggle from 'bootstrap-vue/es/directives/toggle/toggle';

import {
    getBasicSources, getBasicLayout, createStudyTabixSources, createStudyLayout,
    addPanels, deNamespace,
} from '@/util/lz-helpers';

import ExportData from '@/components/ExportData.vue';
import GwasToolbar from '@/components/GwasToolbar.vue';
import LzPlot from '@/components/LzPlot.vue';
import PhewasMaker from '@/components/PhewasMaker.vue';

export default {
    name: 'LocalZoom',
    beforeCreate() {
        // Preserve a reference to component widgets so that their methods can be accessed directly
        //  Some- esp LZ plots- behave very oddly when wrapped as a nested observable; we can
        //  bypass these problems by assigning them as static properties instead of nested
        //  observables.

        this.PHEWAS_TAB = 1;

        this.assoc_plot = null;
        this.assoc_sources = null;

        this.phewas_plot = null;
        this.export_table = null;
    },
    data() {
        return {
            // Used to trigger the initial drawing of the plot
            base_assoc_layout: null,
            base_assoc_sources: null,

            // Current position/ shared state
            pos_chr: null,
            pos_start: null,
            pos_end: null,


            // State to be tracked across all components
            build: null,
            study_names: [],
            selected_tab: 0,

            // For the "phewas plot" label:
            tmp_phewas_study: null,
            tmp_phewas_variant: null,
            tmp_phewas_logpvalue: null,

            // Required for export widget
            tmp_export_callback: null,
            has_credible_sets: false,
            table_data: [],
        };
    },
    computed: {
        has_studies() {
            return !!this.study_names.length;
        },
        allow_phewas() {
            // Our current phewas api only has build 37 datasets; disable option for build 38
            return this.build === 'GRCh37';
        },
    },
    methods: {
        receiveAssocOptions(source_options, plot_options) {
            const { label, reader, parser_config } = source_options;
            const sources = createStudyTabixSources(label, reader, parser_config);
            const { annotations, build, state } = plot_options;
            const panels = createStudyLayout(label, annotations, build);

            if (annotations.credible_sets) {
                // Tell the "export" feature that relevant plot options were used.
                this.has_credible_sets = true;
            }

            this.updateRegion(state);

            if (!this.assoc_plot) {
                this.base_assoc_sources = getBasicSources(sources);

                // Prevent weird resize behavior when switching tabs
                const base_assoc_layout = getBasicLayout(state, panels);
                base_assoc_layout.responsive_resize = false;
                this.base_assoc_layout = base_assoc_layout;
            } else {
                addPanels(this.assoc_plot, this.assoc_sources, panels, sources);
            }
            this.study_names.push(label);
            this.build = build;
        },
        receivePlot(plot, data_sources) {
            this.assoc_plot = plot;
            this.assoc_sources = data_sources;
        },
        updateRegion(region) {
            this.pos_chr = region.chr;
            this.pos_start = region.start;
            this.pos_end = region.end;
        },
        subscribeFields(fields) {
            // This method controls one table widget that draws from plot data, and that widget
            //  listens to only one set of fields at a time.
            if (this.tmp_export_callback) {
                this.assoc_plot.off('data_rendered', this.tmp_export_callback);
                this.tmp_export_callback = null;
            }
            if (!fields.length || !this.assoc_plot) {
                return;
            }
            this.tmp_export_callback = this.assoc_plot.subscribeToData(fields, (data) => {
                this.table_data = data.map(item => deNamespace(item, 'assoc'));
            });
            // In this use case, the plot already has data; make sure it feeds data to the table
            // immediately
            this.assoc_plot.emit('data_rendered');
        },
        onVariantClick(lzEvent) {
            // Respond to clicking on an association plot datapoint
            const panel_name = lzEvent.sourceID;
            if (panel_name.indexOf('association_') === -1) {
                return;
            }

            // TODO: Clean this up a bit to better match original display name
            const variant_data = deNamespace(lzEvent.data, 'assoc');
            this.tmp_phewas_study = panel_name.replace(/^assoc_/, '');// FIXME: remove leading lzplot prefix
            this.tmp_phewas_variant = variant_data.variant;
            this.tmp_phewas_logpvalue = variant_data.log_pvalue;
        },
    },
    components: {
        PhewasMaker,
        ExportData,
        GwasToolbar,
        LzPlot,
        bsCollapse,
        bsCard,
        bsNav,
        bsNavItem,
        bsTab,
        bsTabs,
    },
    directives: { 'b-toggle': bsToggle },
};
</script>

<template>
  <div class="container">
    <div class="row">
      <div class="col-md-12">
        <h1><strong>LocalZoom: Plot your own data with LocusZoom.js</strong></h1>
        <hr>
        <button class="btn-link" v-b-toggle.instructions>Instructions</button>
        <bs-collapse id="instructions" class="mt-2">
          <bs-card>
            <div class="card-text">
            This is a demonstration of loading GWAS results via the web browser, fetching only the
            data
            required for that region. It relies on four assumptions:
            <ol>
              <li>Your data has been stored in a compressed format, and indexed using Tabix. The
                index file must be in the same path, with the suffix <em>.tbi</em></li>
              <li>The data is hosted in a place that is reachable by web browser (eg local files
                or a service such as S3)
              </li>
              <li>If using a remote URL, the host location must support byte range requests. (<a
                  href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests#Checking_if_a_server_supports_partial_requests">how
                to check</a>)
              </li>
              <li>Your file contains information required to draw a plot. Chromosome, position,
                ref, and alt alleles can be specified as either individual columns, or a SNP
                marker (eg <code>chr:pos_ref/alt</code>); there must also be a p-value
                (or -log10 pvalue) for each SNP as a separate column.
                <em>Client-side plots cannot be generated from rsIDs.</em></li>
            </ol>

            <p>This service is designed to efficiently fetch only the data needed for the plot
              region of interest. Therefore, it cannot generate summary views that would require
              processing the entire file (eg Manhattan plots).
            </p>

            <p>
              LD and overlay information is based on a specific build (<strong>build GRCh37</strong>
              or <strong>build GRCh38</strong> are supported). Exercise caution when interpreting
              plots based on a GWAS with positions from a different build.
            </p>

            <p>
              Credible sets are
              <a href="https://github.com/statgen/gwas-credible-sets/">calculated</a> based on the
              p-values for the displayed region. At the moment this tool does not support
              uploading your own custom credible set annotations.
            </p>
            </div>
          </bs-card>
        </bs-collapse>
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <gwas-toolbar
            @config-ready="receiveAssocOptions"
            @select-range="updateRegion"
        />
      </div>
    </div>

    <bs-card no-body>
      <bs-tabs pills card vertical v-model="selected_tab"
               style="min-height:750px;">
        <bs-tab title="GWAS">
          <lz-plot v-if="has_studies"
                   :show_loading="true"
                   :base_layout="base_assoc_layout"
                   :base_sources="base_assoc_sources"
                   :pos_chr="pos_chr"
                   :pos_start="pos_start"
                   :pos_end="pos_end"
                   @region_changed="updateRegion"
                   @element_clicked="onVariantClick"
                   @connected="receivePlot" />
            <div v-else class="placeholder-plot" style="display:table;">
              <span class="text-center" style="display: table-cell; vertical-align:middle">
                Please add a GWAS track to continue
              </span>
            </div>
        </bs-tab>
        <bs-tab :disabled="!has_studies || !allow_phewas">
          <template slot="title">
            <span title="Only available for build GRCh37 datasets">PheWAS</span>
          </template>
          <phewas-maker :variant_name="tmp_phewas_variant" :build="build"
                        :your_study="tmp_phewas_study"
                        :your_logpvalue="tmp_phewas_logpvalue"
                        :allow_render="selected_tab === PHEWAS_TAB"/>
        </bs-tab>
        <bs-tab title="Export" :disabled="!has_studies">
          <export-data :has_credible_sets="has_credible_sets"
                       :study_names="study_names"
                       :table_data="table_data"
                       @requested-data="subscribeFields"/>
        </bs-tab>

      </bs-tabs>
    </bs-card>

    <div class="row">
      <div class="col-md-12">
        <footer style="text-align: center;">
          &copy; Copyright 2019 <a href="https://github.com/statgen">The University of Michigan Center
          for Statistical
          Genetics</a><br>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
    .placeholder-plot {
      width: 100%;
      height: 500px;
      border-style: dashed;
    }
</style>
