<script>
/**
 * A modal dialog window used to specify file parsing configuration options
 * See: https://vuejs.org/v2/examples/modal.html -->
 */
import { BFormGroup, BFormRadio, BTabs, BTab } from 'bootstrap-vue/src/';

import { _isHeader, guessGWAS } from 'locuszoom/esm/ext/lz-parsers/gwas/sniffers';
import { makeGWASParser } from 'locuszoom/esm/ext/lz-parsers/gwas/parsers';
import { has } from 'locuszoom/esm/ext/lz-parsers/utils';

const TAB_FROM_SEPARATE_COLUMNS = 0;
const TAB_FROM_MARKER = 1;

const AF_SPEC = { freq: 1, count: 2 };

const PAGES = {
    variant: 1,
    optional: 2,
};

let uid = 0;

export default {
    name: 'GwasParserOptions',
    components: {
        BFormGroup,
        BFormRadio,
        BTab,
        BTabs,
    },
    props: {
        file_reader: { type: Object, default: null },
    },
    data() {
        return {
            column_titles: [],
            sample_data: [],

            // Which part of the UI should we show?
            current_page: PAGES.variant,
            variant_spec_tab: TAB_FROM_SEPARATE_COLUMNS,
            freq_spec_option: null,

            // Configuration options for variant data
            marker_col: null,

            // These are set by tabix but can be overridden
            chrom_col: this.file_reader.colSeq || null,
            pos_col: this.file_reader.colStart || null,

            // User must define these
            ref_col: null,
            alt_col: null,
            pvalue_col: null,
            is_neg_log_pvalue: false,

            // These fields are each optional and standalone.
            beta_col: null,
            stderr_beta_col: null,

            // Optional AF info is provided by 2-3 fields: `is_alt_effect` + (freq OR 2 counts)
            allele_freq_col: null,
            allele_count_col: null,
            n_samples_col: null,
            is_alt_effect: null,
        };
    },
    computed: {
        freqSpec() {
            const {
                freq_spec_option,
                allele_freq_col,
                allele_count_col,
                n_samples_col,
                is_alt_effect,
            } = this;
            const res = { is_alt_effect };
            let is_valid = (is_alt_effect !== null);

            if (freq_spec_option === AF_SPEC.freq) {
                is_valid = is_valid && has(allele_freq_col);
                res.allele_freq_col = allele_freq_col;
            } else if (freq_spec_option === AF_SPEC.count) {
                is_valid = is_valid && (has(allele_count_col) && has(n_samples_col));
                res.allele_count_col = allele_count_col;
                res.n_samples_col = n_samples_col;
            }
            return is_valid ? res : {};
        },

        variantSpec() {
            // Only provide a value if the variant description is minimally complete
            const { marker_col, chrom_col, pos_col, ref_col, alt_col } = this;
            if (this.variant_spec_tab === TAB_FROM_MARKER && has(marker_col)) {
                return { marker_col };
            }
            if (this.variant_spec_tab === TAB_FROM_SEPARATE_COLUMNS
                && has(pos_col) && has(chrom_col)) {
                const ret = { chrom_col, pos_col };
                if (has(ref_col) && has(alt_col)) { // Must specify both, or neither.
                    Object.assign(ret, { ref_col, alt_col });
                }
                return ret;
            }
            return {};
        },
        parserOptions() {
            const { pvalue_col, is_neg_log_pvalue, beta_col, stderr_beta_col } = this;
            return Object.assign(
                {},
                {
                    pvalue_col,
                    is_neg_log_pvalue,
                    beta_col,
                    stderr_beta_col,
                },
                this.variantSpec,
                this.freqSpec
            );
        },
        isValid() {
            const hasVariant = Object.keys(this.variantSpec).length !== 0;
            const hasP = has(this.parserOptions.pvalue_col);
            return hasVariant && hasP;
        },
        parser() {
            if (this.isValid) {
                try {
                    return makeGWASParser(this.parserOptions);
                } catch (e) {
                    return () => {
                        throw new Error('Invalid parser configuration');
                    };
                }
            }
            return () => {};
        },
        preview() {
            try {
                return this.parser(this.sample_data[0]);
            } catch (e) {
                console.error(e);
                return { error: e.toString() || 'Could not parse column contents' };
            }
        },
    },
    watch: {
        file_reader: {
            immediate: true,
            handler() {
                // Uses a watcher to resolve async value fetch.
                // Not every tabix file represents column header data in the same way: in some, it's
                //  the last line with a comment (meta) character. In others, there is no meta
                //   char, so we use the last line that was skipped
                // Fetch 25 rows of data. The last skipped line is assumed to be column headers;
                //  the last total line is assumed to be data.
                // This wizard assumes all files are tabix (tab delimited)

                // Find headers by fetching a large block of lines, and picking the best ones
                const callback = (rows, err) => {
                    // Read data (and last-ditch attempt to find headers, if necessary)
                    let first_data_index;
                    if (this.file_reader.skip) {
                        // A tabix reader defines headers as "comment lines and/or lines you skip"
                        first_data_index = this.file_reader.skip;
                    } else {
                        // Some files use headers that are not comment lines.
                        first_data_index = rows.findIndex((text) => !_isHeader(text));
                    }
                    this.sample_data = rows.slice(first_data_index);
                    const data_rows = this.sample_data.map((line) => line.split('\t'));
                    // Get column titles (if present)
                    if (first_data_index > 0) { // 0 = no headers; -1 = no rows or no data found
                        // When data is first loaded, generate a suggested auto-config
                        this.column_titles = rows[first_data_index - 1]
                            .replace(/^#+/g, '')
                            .split('\t');

                        // When data is first loaded, generate a suggested auto-config
                        const guess = guessGWAS(this.column_titles, data_rows);
                        if (guess) {
                            Object.assign(this, guess);
                            // If config is detected, set the UI to show best options
                            this.variant_spec_tab = has(guess.marker_col)
                                ? TAB_FROM_MARKER : TAB_FROM_SEPARATE_COLUMNS;
                        }
                    } else {
                        // If column headers could not be found, then we can't guess config.
                        // Provide a set of UI-only labels so that dropdowns are not empty
                        // TODO: We may be seeing files with no data (esp in non-tabix mode).
                        //    Improve handling of such edge cases.
                        const num_cols = rows.length ? rows[0].split('\t').length : 0;
                        this.column_titles = [...new Array(num_cols)]
                            .map((item, index) => `Column ${index + 1}`);
                    }
                };
                this.file_reader.fetchHeader(callback, {
                    nLines: 30,
                    metaOnly: false,
                });
            },
        },
    },
    beforeCreate() {
        uid += 1;
        this._uid = uid;
        // Makes enums available within vue template
        this.PAGES = PAGES;
        this.AF_SPEC = AF_SPEC;
    },
    mounted() {
        document.body.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                this.$emit('close');
            }
        });
    },
    methods: {
        sendOptions() {
            // The preview (first line of file) will set the default locus (view) for this data
            const init_position = this.preview.position;
            const window_size = 500000;
            // Pad the range a little so that the first point is easy to spot
            const start = Math.max(0, init_position - window_size * 0.1);
            const init_state = {
                chr: this.preview.chromosome,
                start: start,
                end: start + window_size * 0.9,
            };
            this.$emit('ready', Object.assign({}, this.parserOptions), init_state);
            this.$emit('close');
        },
    },
};
</script>

<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Select file options...</h3>
            <button
              class="pull-right"
              aria-label="close"
              @click="$emit('close')">X
            </button>
          </div>
          <div class="modal-body">
            <div>
              <div v-if="current_page === PAGES.variant">
                <b-tabs v-model="variant_spec_tab">
                  <b-tab
                    title="Variant from columns"
                    class="pt-3">
                    <div class="form-group row">
                      <label
                        :for="`vs-chr-${_uid}`"
                        class="col-sm-2">Chromosome</label>
                      <div class="col-sm-4">
                        <select
                          :id="`vs-chr-${_uid}`"
                          v-model="chrom_col"
                          class="form-control">
                          <option
                            v-for="(item, index) in column_titles"
                            :value="index + 1"
                            :key="index">
                            {{ item }}
                          </option>
                        </select>
                      </div>
                      <label
                        :for="`vs-pos-${_uid}`"
                        class="col-sm-2">Position</label>
                      <div class="col-sm-4">
                        <select
                          :id="`vs-pos-${_uid}`"
                          v-model="pos_col"
                          class="form-control">
                          <option
                            v-for="(item, index) in column_titles"
                            :value="index + 1"
                            :key="index">
                            {{ item }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div class="form-group row">
                      <label
                        :for="`vs-ref-${_uid}`"
                        class="col-sm-2">Ref allele</label>
                      <div class="col-sm-4">
                        <select
                          :id="`vs-ref-${_uid}`"
                          v-model="ref_col"
                          class="form-control">
                          <option
                            v-for="(item, index) in column_titles"
                            :value="index + 1"
                            :key="index">
                            {{ item }}
                          </option>
                        </select>
                      </div>
                      <label
                        :for="`vs-alt-${_uid}`"
                        class="col-sm-2">Alt allele</label>
                      <div class="col-sm-4">
                        <select
                          :id="`vs-alt-${_uid}`"
                          v-model="alt_col"
                          class="form-control">
                          <option
                            v-for="(item, index) in column_titles"
                            :value="index + 1"
                            :key="index">
                            {{ item }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </b-tab>
                  <b-tab
                    title="Variant from marker"
                    class="pt-3">
                    <div class="form-group row">
                      <label
                        :for="`vs-marker-${_uid}`"
                        class="col-sm-2">Marker</label>
                      <div class="col-sm-4">
                        <select
                          :id="`vs-marker-${_uid}`"
                          v-model="marker_col"
                          class="form-control">
                          <option
                            v-for="(item, index) in column_titles"
                            :value="index + 1"
                            :key="index">
                            {{ item }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </b-tab>
                </b-tabs>
                <div class="form-group row">
                  <label
                    :for="`vs-pval-${_uid}`"
                    class="col-sm-2">P-value column</label>
                  <div class="col-sm-4">
                    <select
                      :id="`vs-pval-${_uid}`"
                      v-model="pvalue_col"
                      class="form-control">
                      <option
                        v-for="(item, index) in column_titles"
                        :value="index + 1"
                        :key="index">
                        {{ item }}
                      </option>
                    </select>
                  </div>
                  <div class="col-sm-2">
                    <label
                      for="is_neg_log_pvalue"
                      class="form-check-label"
                      style="white-space: nowrap">
                      is <em>-log<sub>10</sub>(p)</em>
                    </label>
                  </div>
                  <div class="col-sm-4">
                    <div class="form-check float-left">
                      <input
                        id="is_neg_log_pvalue"
                        v-model="is_neg_log_pvalue"
                        type="checkbox"
                        class="form-check-input">
                    </div>
                  </div>
                </div>
              </div>

              <div v-else-if="current_page === PAGES.optional">
                <h3>Optional fields</h3>
                <div class="form-group row">
                  <label
                    :for="`vs-beta-${_uid}`"
                    class="col-sm-2">Effect size</label>
                  <div class="col-sm-4">
                    <select
                      :id="`vs-beta-${_uid}`"
                      v-model="beta_col"
                      class="form-control">
                      <option
                        v-for="(item, index) in column_titles"
                        :value="index + 1"
                        :key="index">
                        {{ item }}
                      </option>
                    </select>
                  </div>
                  <div class="col-sm-6"/>
                </div>
                <div class="form-group row">
                  <label
                    :for="`vs-stderr-${_uid}`"
                    class="col-sm-2">Std. Err.</label>
                  <div class="col-sm-4">
                    <select
                      :id="`vs-stderr-${_uid}`"
                      v-model="stderr_beta_col"
                      class="form-control">
                      <option
                        v-for="(item, index) in column_titles"
                        :value="index + 1"
                        :key="index">
                        {{ item }}
                      </option>
                    </select>
                  </div>
                </div>
                <h4>Allele Frequency</h4>
                <div class="form-group row">
                  <label class="col-sm-2">Effect allele</label>
                  <div class="col-sm-10">
                    <b-form-radio
                      :value="false"
                      v-model="is_alt_effect"
                      inline>Ref</b-form-radio>
                    <b-form-radio
                      :value="true"
                      v-model="is_alt_effect"
                      inline>Alt</b-form-radio>
                  </div>
                </div>

                <div class="form-group row">
                  <label class="col-sm-2">Specify from</label>
                  <div class="col-sm-10">
                    <b-form-radio
                      :value="AF_SPEC.freq"
                      v-model="freq_spec_option"
                      inline>Frequency</b-form-radio>
                    <b-form-radio
                      :value="AF_SPEC.count"
                      v-model="freq_spec_option"
                      inline>Counts</b-form-radio>
                  </div>
                </div>

                <div v-if="freq_spec_option === AF_SPEC.freq">
                  <div class="form-group row">
                    <label
                      :for="`vs-af-freq-${_uid}`"
                      class="col-sm-2">Frequency</label>
                    <div class="col-sm-4">
                      <select
                        :id="`vs-af-freq-${_uid}`"
                        v-model="allele_freq_col"
                        class="form-control">
                        <option
                          v-for="(item, index) in column_titles"
                          :value="index + 1"
                          :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                    <div class="col-sm-6"/>
                  </div>
                </div>
                <div v-else-if="freq_spec_option === AF_SPEC.count">
                  <div class="form-group row">
                    <label
                      :for="`vs-af-count-${_uid}`"
                      class="col-sm-2">Count</label>
                    <div class="col-sm-4">
                      <select
                        :id="`vs-af-count-${_uid}`"
                        v-model="allele_count_col"
                        class="form-control">
                        <option
                          v-for="(item, index) in column_titles"
                          :value="index + 1"
                          :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                    <label
                      :for="`vs-af-ns-${_uid}`"
                      class="col-sm-2"># Samples</label>
                    <div class="col-sm-4">
                      <select
                        :id="`vs-af-ns-${_uid}`"
                        v-model="n_samples_col"
                        class="form-control">
                        <option
                          v-for="(item, index) in column_titles"
                          :value="index + 1"
                          :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <span class="text-muted">
                    Please select a frequency option in order to use this feature
                  </span>
                </div>

              </div>

              <div class="row">
                <div class="card card-body bg-light">
                  <div v-if="isValid && preview.error">
                    <span class="text-danger">{{ preview.error }}</span>
                  </div>
                  <div v-else-if="isValid">
                    <table class="preview-table">
                      <tr>
                        <td>Variant</td>
                        <td>{{ preview.variant }}</td>
                      </tr>
                      <tr>
                        <td>-log<sub>10</sub>(p)</td>
                        <td>{{ preview.log_pvalue.toFixed(3) }}</td>
                      </tr>
                      <tr>
                        <td>&beta;</td>
                        <td>{{ preview.beta ? preview.beta.toFixed(3) : '' }}</td>
                      </tr>
                      <tr>
                        <td>SE(&beta;)</td>
                        <td>{{ preview.stderr_beta ? preview.stderr_beta.toFixed(3): '' }}</td>
                      </tr>
                      <tr>
                        <td>Allele freq</td>
                        <td>
                          {{ preview.alt_allele_freq ? preview.alt_allele_freq.toFixed(3) : '' }}
                        </td>
                      </tr>
                    </table>
                  </div>
                  <div v-else>
                    Please select options to preview parsed data.
                  </div>
                </div>
              </div>

              <div class="row mt-3">
                <button
                  v-if="current_page === PAGES.optional"
                  :disabled="!isValid"
                  class="btn btn-success ml-auto"
                  @click="sendOptions">
                  Accept options
                </button>
                <button
                  v-else
                  :disabled="!isValid"
                  class="btn btn-success ml-auto"
                  @click="current_page += 1">Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .5);
    overflow-y: scroll;
    transition: opacity .3s ease;
  }

  .modal-wrapper {
    vertical-align: middle;
  }

  .modal-container {
    width: 800px;
    height: 85%;
    overflow-y: auto;
    margin: 0 auto;
    padding: 20px 30px;
    background-color: #fff;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
    transition: all .3s ease;
    font-family: Helvetica, Arial, sans-serif;
  }

  .modal-header h3 {
    margin-top: 0;
    color: #42b983;
  }

  .modal-body {
    margin: 20px 0;
    overflow-y: scroll;
  }

  /*
   * The following styles are auto-applied to elements with
   * transition="modal" when their visibility is toggled
   * by Vue.js.
   *
   * You can easily play with the modal transition by editing
   * these styles.
   */
  .modal-enter {
    opacity: 0;
  }

  .modal-leave-active {
    opacity: 0;
  }

  .modal-enter .modal-container,
  .modal-leave-active .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
  }

  .preview-table td {
    text-align: right;
    padding-right: 20px;
  }
</style>
