<script>

import 'locuszoom/dist/locuszoom.css';
import { BCard, BCollapse, VBToggle, BTab, BTabs } from 'bootstrap-vue/src/';

import {
    activateUserLD, getBasicSources, getBasicLayout,
} from './util/lz-helpers';
import { count_add_track, count_region_view, setup_feature_metrics } from './util/metrics';

import PlotPanes from './components/PlotPanes.vue';
import GwasToolbar from './components/GwasToolbar.vue';
import { DATA_TYPES } from './util/constants';


export default {
    name: 'LocalZoom',
    components: {
        BCollapse,
        BCard,
        BTab,
        BTabs,
        GwasToolbar,
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
                if (data_type === DATA_TYPES.PLINK_LD) {
                    // Modify plot widget internals for LD. This implies a lot of coupling between pieces, but works for now.
                    const source_name = source_configs[0][0]; // we happen to know that LD generates one datasource and name is first item of config
                    this.$refs.plotWidget.$refs.assoc_plot.callPlot((plot) => {
                        activateUserLD(plot, display_name, source_name);
                    });
                }
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
          class="mt-1 mb-4">
          <b-card>
            <div class="card-text">
              <b-tabs card>
                <b-tab title="General">
                  <p>
                    If you have found this tool useful, please cite our paper,
                    <a href="https://doi.org/10.1093/bioinformatics/btab186" target="_blank">LocusZoom.js:
                    interactive and embeddable visualization of genetic association study results</a> (Bioinformatics 2021).
                  </p>

                  <p>
                    LocalZoom is a tool for generating region association plots via the web browser.
                    It can be used on any Tabix-indexed file (including those stored on your hard drive), which
                    makes it useful for sensitive or confidential data. If you are comfortable uploading
                    your data to a server, consider the <a href="https://my.locuszoom.org">my.locuszoom.org</a> upload service instead,
                    which provides additional annotation features and does not require you to compress or index your data.
                    (note that the upload service is limited to files &lt;= 1GB)
                    LocalZoom relies on four assumptions:
                  </p>
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
                    <li>Your file contains all of the information required to draw a plot (see individual file format instructions for details).</li>
                  </ol>

                  <p>
                    This service is designed to efficiently fetch only the data needed for the plot
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
                </b-tab>

                <b-tab title="GWAS">
                  <h3>What data is required?</h3>
                  <p>
                    LocalZoom can read GWAS summary statistics from many file formats. When you add a
                    study, we will attempt to automatically detect the columns for particular fields
                    of interest, based on heuristic rules derived from several dozen common programs
                    or file formats. The <a href="https://my.locuszoom.org/about/#prepare-data">required fields</a>
                    are the same as for my.locuszoom.org, a related tool also developed at UMich.
                    When you load a file, you will be asked to confirm the auto-determined options.
                  </p>

                  <h3>How should I prepare my files?</h3>
                  <p>
                    We attempt to support many GWAS file formats, and hence there is no single set of
                    instructions for everyone. Below is a sample command that may be helpful; it is presented as several commands in
                    a sequence, so that it can be run all at once as part of a data preparation workflow (like snakemake).
                  </p>
                  <p>
                    To support sorting and tabix indexing, your file will need to specify chromosome and position as separate fields, with tab delimiters.
                    The example below assumes one header row, with chromosome as column 1 and position as column 2.
                  </p>
                  <dl>
                    <dt>Sort file, compress, and tabix-index results</dt>
                    <dd>
                      Many programs already output summary statistics sorted by chromosome and position. If your tool does not, then you will need to sort the file before creating a tabix index (tabix is a tool that allows someone to query a file for all data in a contiguous genomic region).
                      If your data is already sorted, then the "awk" step can be omitted, but you will still need to run <i>bgzip</i> and <i>tabix</i>.
                      Assuming that your chromosome is in column 1 and position in column 2, with one header row (skipped in both the awk "NR" command and the tabix --skip-lines flag):<br>
                      <code>zcat &lt; summstats.tab.gz | awk 'NR&lt;=1{print $0;next}{print $0| "sort -k1,1V -k2,2n"}' | bgzip -c &gt; summstats.sorted.tab.gz && tabix -s1 -b 2 -e 2 --skip-lines 1 -f summstats.sorted.tab.gz</code><br>
                    </dd>

                    <dt>(rarely needed) Converting to tab delimiters</dt>
                    <dd>
                      Most modern GWAS programs output tab-delimited results (in each row, columns are separated via a tab character)- this makes it much easier to use popular generic indexing tools like tabix.
                      Some old programs (such as PLINK 1.x) may generate files that use a different character
                      ("space delimited" or "fixed width" formats), and append extra spaces to the start and end of a row.
                      In the rare case where you need to accommodate such a program, the following command may be helpful to clean up the file format before use:<br>
                      <code>cat filename.txt | sed 's/^[[:space:]]*//g' | sed 's/[[:space:]]*$//g' | tr -s ' ' '\t' &gt; > filename.tab</code>
                    </dd>
                  </dl>
                </b-tab>

                <b-tab title="BED files">
                  <p>
                    BED files are a <a href="https://genome.ucsc.edu/FAQ/FAQformat.html#format1">standard format</a> with 3-12 columns of data.
                    The default LocusZoom panel layout for a BED track will use chromosome, position, line name, and (optionally) color
                    to draw the plot. Score will be shown as a tooltip field (if present); it may have a different meaning and scale
                    depending on the contents of your BED file. As with any LocusZoom track, custom layouts can be created to render data in different ways, or to use more or
                    fewer columns based on the data of interest.
                  </p>

                  <p>
                    The following command is helpful for preparing BED files for use in the browser:<br>
                    <code>$ sort -k1,1 -k2,2n input.bed | bgzip &gt; input-sorted.bed.gz && tabix -p bed input-sorted.bed.gz</code><br>
                    Some BED files will have one or more header rows; in this case, modify the tabix command with: <code>--skip-lines N</code> (where N is the number of headers).
                  </p>
                </b-tab>

                <b-tab title="PLINK 1.9 LD">
                  <h3>Before you begin</h3>
                  <p>
                    Although PLINK is targeted as a (historically) popular tool for computing LD,
                    the file format it generates must be transformed before using in a plot. Read these instructions carefully for help using the data with LocalZoom.
                    We presently do not support arbitrary file formats, as this is an area of active innovation and there is no single clear standard.
                    We welcome feedback on generally useful improvements; the current process is rather kludgy!
                  </p>
                  <h3>Purpose</h3>
                  <p>
                    Linkage Disequilibrium is an important tool for interpreting LocusZoom.js plots. In order to support viewing any
                    region, most LocusZoom.js usages take advantage of the Michigan LD server to calculate region-based LD relative
                    to a particular reference variant, based on the well-known 1000G reference panel.
                  </p>

                  <p>
                    We recognize that the 1000G reference panel (and its sub-populations) is not suited to all cases, especially for
                    studies with ancestry-specific results or large numbers of rare variants not represented in a public panel.
                    For many groups, <a href="https://github.com/statgen/LDServer/">setting up a private LD Server instance</a> is not an option.
                    As a fallback, we support parsing a file format derived from PLINK 1.9 `--ld-snp` calculations. Instructions
                    for preparing these files are provided below. <strong>Due to the potential for very large output files, we only
                    support pre-calculated LD relative to one (or a few) LD reference variants; this means that this feature
                    requires some advance knowledge of interesting regions in order to be useful.</strong> If the user views any
                    region that is not near a pre-provided reference variant, they will see grey dots indicating the absence of LD information.
                    We have intentionally restricted the demo so that this limitation is clear.
                  </p>

                  <h3>How to run PLINK and format output</h3>
                  <dl>
                    <dt><b>Preparing genotype files: harmonizing ID formats</b></dt>
                    <dd>
                      LocusZoom typically calculates LD relative to a variant by EPACTS-format specifier (chrom:pos_ref/alt).
                      However, genotype VCF files have no single standard for how variants are identified, which can make it hard to match the requested variant to the actual data.
                      Some files are not even internally consistent, which makes it hard to write easy copy-and-paste commands that would work widely
                      across files. Your file can be transformed to match the tutorial assumptions via common tool and the command below:<br>

                      <code>bcftools annotate -Oz --set-id '%CHROM\:%POS\_%REF\/%ALT' original_vcf.gz &gt; vcfname_epacts_id_format.gz</code><br>

                      <em>In some rare cases (such as <a href="https://www.internationalgenome.org/faq/why-are-there-duplicate-calls-in-the-phase-3-call-set">1000G phase 3</a>), data preparation errors may result in duplicate entries for the same variant. This can break PLINK. A command such as the one below can be used to find these duplicates:<br>
                        <code>zcat &lt; vcfname_epacts_id_format.gz | cut -f3 | sort | uniq -d</code><br>
                        They can then be removed using the following command (check the output carefully before using, because reasons for duplicate lines vary widely):
                      </em><br>
                      <code>bcftools norm -Oz --rm-dup all vcfname_epacts_id_format.gz &gt; vcfname_epacts_id_format_rmdups.gz</code>
                    </dd>

                    <dt><b>Calculating LD relative to reference variants</b></dt>
                    <dd>
                      The command below will calculate LD relative to (several) variants in a 500 kb region centered around each reference variant.<br>
                      <code>plink-1.9 --r2 --vcf vcfname_epacts_id_format.gz --ld-window 499999 --ld-window-kb 500 --ld-window-r2 0.0 --ld-snp-list mysnplist.txt</code><br>

                      This command assumes the presence of a file named <em>mysnplist.txt</em>, which contains a series of rows like the example below:<br>
                      <pre style="background: #F4F4F4">16:53842908_G/A
16:53797908_C/G
16:53809247_G/A</pre>
                    </dd>
                    <dt><b>Preparing the LD output file for use with LocusZoom.js</b></dt>
                    <dd>
                      As of this writing, this tutorial assumes a "list of SNPs" feature that requires PLINK 1.9.x (and is not yet available in newer versions).
                      Unfortunately, PLINK's default output format is not compatible with tabix, for historical reasons.
                      Transform to a format readable by LocusZoom via the following sequence of commands.<br>
                      <code>cat plink.ld | tail -n+2 | sed 's/^[[:space:]]*//g' | sed 's/[[:space:]]*$//g' | tr -s ' ' '\t' | sort -k4,4 -k5,5n | bgzip &gt; plink.ld.tab.gz && tabix -s4 -b5 -e5 plink.ld.tab.gz</code>
                    </dd>

                    <dt><b>I don't use PLINK; how should my file be formatted?</b></dt>
                    <dd>
                      A custom LD file should be tab-delimited. It should specify a reference variant ("SNP_A") and LD for all others relative to that variant ("SNP_B"). The first two rows will look like the following example, taken from actual PLINK output:
                      <pre style="background: #F4F4F4">CHR_A&#9;BP_A&#9;SNP_A&#9;CHR_B&#9;BP_B&#9;SNP_B&#9;R2
22&#9;37470224&#9;22:37470224_T/C&#9;22&#9;37370297&#9;22:37370297_T/C&#9;0.000178517</pre>

                      <em>Note: pre-calculated LD files can easily become very large. We recommend only outputting LD relative to a few target reference variants at a time.</em>
                    </dd>
                  </dl>
                </b-tab>
              </b-tabs>
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
          @select-range="updateRegion"/>
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
