<script>

import 'locuszoom/dist/locuszoom.css';
import { BCard, BCollapse, VBToggle } from 'bootstrap-vue/src/';

import {
    getBasicSources, getBasicLayout,
} from './util/lz-helpers';
import { count_add_track, count_region_view, setup_feature_metrics } from './util/metrics';

import PlotPanes from './components/PlotPanes.vue';
import GwasToolbar from './components/GwasToolbar.vue';


export default {
    name: 'LocalZoom',
    components: {
        GwasToolbar,
        BCollapse,
        BCard,
        PlotPanes,
    },
    directives: { VBToggle },
    data() {
        return {
            // Used to trigger the initial drawing of the plot
            base_layout: null,
            base_sources: null,

            // Current position/ shared state
            chr: null,
            start: null,
            end: null,

            // State to be tracked across all components
            genome_build: 'GRCh37',
            known_tracks: [],
            // Control specific display options
            has_credible_sets: true,
        };
    },
    methods: {
        receiveTrackOptions(data_type, filename, display_name, source_configs, panel_configs, extra_plot_state) {
            if (!this.known_tracks.length) {
                // If this is the first track added, allow the new track to suggest a region of interest and navigate there if relevant (mostly just GWAS)
                this.updateRegion(extra_plot_state);

                this.base_sources = getBasicSources(source_configs);
                this.base_layout = getBasicLayout(extra_plot_state, panel_configs);

                // Collect metrics for first plot loaded
                count_region_view();
            } else {
                // TODO: We presently ignore extra plot state (like region) when adding new tracks. Revisit for future data types.
                this.$refs.plotWidget.addStudy(panel_configs, source_configs);
            }

            count_add_track(data_type);
            this.known_tracks.push({data_type, filename, display_name});
        },
        activateMetrics() {
            // After plot is created, initiate metrics capture
            // TODO: This is a mite finicky; consider further refactoring in the future?
            this.$refs.plotWidget.$refs.assoc_plot.callPlot(setup_feature_metrics);
        },
        updateRegion({ chr, start, end }) {
            // Receive new region config from toolbar
            if (!chr || !start || !end) {
                return;
            }
            this.chr = chr;
            this.start = start;
            this.end = end;
        },
    },
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col-md-12">
        <h1><strong>LocalZoom: Plot your own data with LocusZoom.js</strong></h1>
        <hr>
        <button
          v-v-b-toggle.instructions
          class="btn btn-link">Instructions</button>
        <b-collapse
          id="instructions"
          class="mt-2">
          <b-card>
            <div class="card-text">
              LocalZoom is a tool for generating region association plots via the web browser.
              It can be used on any Tabix-indexed file (including those stored on your hard drive), which
              makes it useful for sensitive or confidential data. If you are comfortable uploading
              your data to a server, consider the <a href="https://my.locuszoom.org">my.locuszoom.org</a> upload service instead,
              which provides additional annotation features and does not require you to compress or index your data.
              (note that the upload service is limited to files &lt;= 1GB)
              LocalZoom relies on four assumptions:
              <ol>
                <li>Your data is a text-based, tab-delimited file that has been stored in a compressed format,
                and <a href="http://www.htslib.org/doc/tabix.html">indexed using Tabix</a>. The
                index file must be in the same path, with the suffix <em>.tbi</em></li>
                <li>The data is hosted in a place that is reachable by web browser (eg local files
                or a service such as S3)
                </li>
                <li>If using a remote URL, the host location must support byte range requests. (<a
                  href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests#Checking_if_a_server_supports_partial_requests">how
                  to check</a>)
                </li>
                <li>Your file contains all of the information required to draw a plot. Chromosome, position,
                ref, and alt alleles can be specified as either individual columns, or a variant
                marker string (eg <code>chr:pos_ref/alt</code>); there must also be a p-value
                (or -log10 pvalue) for each variant as a separate column. Beta, SE, and alt allele
                frequency information are optional, but will be used on the plot if provided.
                <em>Client-side plots cannot be generated from rsIDs.</em></li>
              </ol>

              <p>This service is designed to efficiently fetch only the data needed for the plot
              region of interest. Therefore, it cannot generate summary views that would require
              processing the entire file (eg Manhattan plots).
              </p>

              <p>
                LD and overlay information is based on a specific human genome build (<strong>build GRCh37</strong>
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
          </b-card>
        </b-collapse>
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <gwas-toolbar
          :has_credible_sets.sync="has_credible_sets"
          :genome_build.sync="genome_build"
          :max_studies="6"
          :known_tracks="known_tracks"
          @add-tabix-track="receiveTrackOptions"
          @select-range="updateRegion"
        />
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <plot-panes
          ref="plotWidget"
          :base_layout="base_layout"
          :base_sources="base_sources"
          :dynamic_urls="true"
          :genome_build="genome_build"
          :has_credible_sets="has_credible_sets"
          :known_tracks="known_tracks"
          :chr="chr"
          :start="start"
          :end="end"
          @plot-created="activateMetrics"
        />
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <footer style="text-align: center;">
          &copy; Copyright {{ new Date().getFullYear() }} <a href="https://github.com/statgen">The University of Michigan
          Center for Statistical Genetics</a><br>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
