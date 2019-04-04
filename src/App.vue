<script>
import bsCard from 'bootstrap-vue/es/components/card/card';
import bsCollapse from 'bootstrap-vue/es/components/collapse/collapse';
import bsNav from 'bootstrap-vue/es/components/nav/nav';
import bsNavItem from 'bootstrap-vue/es/components/nav/nav-item';
import bsToggle from 'bootstrap-vue/es/directives/toggle/toggle';

import {
    getBasicSources, getBasicLayout,
    createStudyTabixSources, createStudyLayout,
} from './util/lz-helpers';

import PlotPanes from './components/PlotPanes.vue';
import GwasToolbar from './components/GwasToolbar.vue';


export default {
    name: 'LocalZoom',
    data() {
        return {
            // Used to trigger the initial drawing of the plot
            base_assoc_layout: null,
            base_assoc_sources: null,

            // Current position/ shared state
            chr: null,
            start: null,
            end: null,

            // State to be tracked across all components
            build: null,
            study_names: [],
            // Control specific display options TODO improve
            has_credible_sets: false,
        };
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

            if (!this.study_names.length) {
                // Creating the initial plot can be done by simply passing props directly
                this.base_assoc_sources = getBasicSources(sources);
                // Prevent weird resize behavior when switching tabs
                const base_assoc_layout = getBasicLayout(state, panels);
                base_assoc_layout.responsive_resize = false;
                this.base_assoc_layout = base_assoc_layout;
            } else {
                // Adding subsequent panels is a more advanced usage; manipulate the child widget
                this.$refs.plotWidget.addStudy(panels, sources);
            }
            this.study_names.push(label);
            this.build = build;
        },

        updateRegion(region) {
            // Receive new region config from toolbar
            this.chr = region.chr;
            this.start = region.start;
            this.end = region.end;
        },
    },
    components: {
        GwasToolbar,
        bsCollapse,
        bsCard,
        bsNav,
        bsNavItem,
        PlotPanes,
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
            :max_studies="4"
        />
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <plot-panes ref="plotWidget"
                    :dynamic_urls="true"
                    :assoc_layout="base_assoc_layout" :assoc_sources="base_assoc_sources"
                    :study_names="study_names" :has_credible_sets="has_credible_sets"
                    :build="build"
                    :chr="chr" :start="start" :end="end" />
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <footer style="text-align: center;">
          &copy; Copyright 2019 <a href="https://github.com/statgen">The University of Michigan
          Center for Statistical Genetics</a><br>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
