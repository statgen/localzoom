<!-- A modal dialog window -->
<!-- See: https://vuejs.org/v2/examples/modal.html -->
<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Select file options...</h3>
            <button class="pull-right" aria-label="close"
                    @click="$emit('close')">X
            </button>
          </div>
          <div class="modal-body">
            <div>
              <div class="form-group row">
                <label for="display_name" class="col-sm-3">Dataset Label</label>
                <div class="col-sm-9">
                  <input id="display_name" class="form-control" type="text" v-model="file_name">
                </div>
              </div>

              <bs-tabs v-model="variant_spec_tab">
                <bs-tab title="Variant from columns" class="pt-3">
                  <div class="form-group row">
                    <label for="vs-chr" class="col-sm-2">Chromosome</label>
                    <div class="col-sm-4">
                      <select id="vs-chr" v-model="chr_col" disabled class="form-control">
                        <option v-for="(item, index) in column_titles" :value="index" :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                    <label for="vs-pos" class="col-sm-2">Position</label>
                    <div class="col-sm-4">
                      <select id="vs-pos" v-model="pos_col" disabled class="form-control">
                        <option v-for="(item, index) in column_titles" :value="index" :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group row">
                    <label for="vs-ref" class="col-sm-2">Ref allele</label>
                    <div class="col-sm-4">
                      <select id="vs-ref" v-model="ref_col" class="form-control">
                        <option v-for="(item, index) in column_titles" :value="index" :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                    <label for="vs-alt" class="col-sm-2">Alt allele</label>
                    <div class="col-sm-4">
                      <select id="vs-alt" v-model="alt_col" class="form-control">
                        <option v-for="(item, index) in column_titles" :value="index" :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                  </div>
                </bs-tab>
                <bs-tab title="Variant from marker" class="pt-3">
                  <div class="form-group row">
                    <label for="vs-marker" class="col-sm-2">Marker</label>
                    <div class="col-sm-4">
                      <select id="vs-marker" v-model="marker_col" class="form-control">
                        <option v-for="(item, index) in column_titles" :value="index" :key="index">
                          {{ item }}
                        </option>
                      </select>
                    </div>
                  </div>
                </bs-tab>
              </bs-tabs>

              <div class="form-group row">
                <label for="vs-pval" class="col-sm-2">P-value column</label>
                <div class="col-sm-4">
                  <select id="vs-pval" v-model="pvalue_col" class="form-control">
                    <option v-for="(item, index) in column_titles" :value="index" :key="index">
                      {{ item }}
                    </option>
                  </select>
                </div>
                <div class="col-sm-2">
                  <label for="is_log_p" class="form-check-label" style="white-space: nowrap">
                    Uses <em>-log<sub>10</sub>(p)</em>
                  </label>
                </div>
                <div class="col-sm-4">
                  <div class="form-check float-left">
                    <input id="is_log_p" v-model="is_log_p"
                           type="checkbox" class="form-check-input">
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="card card-body bg-light">
                  <div v-if="isValid && preview.error">
                    <span class="text-danger">{{ preview.error }}</span>
                  </div>
                  <div v-else-if="isValid">
                    Variant: {{ preview.variant }}<br>
                    -log<sub>10</sub>(p): {{ preview.log_pvalue.toFixed(3) }}
                  </div>
                  <div v-else>
                    Please select options to preview parsed data
                  </div>
                </div>
              </div>

              <div class="row mt-3">
                <button class="btn btn-primary ml-auto"
                        :disabled="!isValid" @click="sendOptions">
                  Accept options
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import bsTabs from 'bootstrap-vue/es/components/tabs/tabs';
import bsTab from 'bootstrap-vue/es/components/tabs/tab';

import makeParser from '../util/parsers';

export default {
    name: 'adder-wizard',
    props: ['file_reader', 'file_name'],
    data() {
        return {
            // Pages: select_source, select_options, accept_options
            column_titles: [],
            sample_data: '',

            // Configuration options for variant data
            variant_spec_tab: 0, // 0 = columns, 1 = marker
            // Individual form field options
            marker_col: null,
            ref_col: null,
            alt_col: null,
            pvalue_col: null,
            is_log_p: false,
        };
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

                if (!this.file_reader.skip) {
                    // No lines skipped, grab last "true" header
                    this.file_reader.fetchHeader((rows, err) => {
                        // TODO: Incorporate proper meta char
                        this.column_titles = rows[rows.length - 1].replace(/^#+/g, '')
                            .split('\t');
                    });
                }
                this.file_reader.fetchHeader((rows, err) => {
                    // Read data (and last-ditch attempt to find headers, if necessary)
                    if (this.file_reader.skip) {
                        // TODO: Incorporate proper meta char
                        this.column_titles = rows[this.file_reader.skip - 1].replace(/^#+/g, '')
                            .split('\t');
                    }
                    this.sample_data = rows[rows.length - 1]; // Give line parser a raw string
                }, {
                    nLines: 25,
                    metaOnly: false,
                });
            },
        },
    },
    computed: {
        chr_col() {
            return this.file_reader.colSeq - 1;
        },
        pos_col() {
            return this.file_reader.colStart - 1;
        },
        variantSpec() {
            // Only provide a value if the variant description is minimally complete
            const { marker_col, chr_col, pos_col, ref_col, alt_col } = this;
            if (this.variant_spec_tab === 1 && marker_col !== null) {
                return { marker_col };
            } else if (pos_col !== null && chr_col !== null) {
                // Ref and alt are optional
                return {
                    chr_col,
                    pos_col,
                    ref_col,
                    alt_col,
                };
            }
            return {};
        },
        parserOptions() {
            const { pvalue_col, is_log_p } = this;
            return Object.assign({}, this.variantSpec, {
                pvalue_col,
                is_log_p,
            });
        },
        isValid() {
            const hasVariant = Object.keys(this.variantSpec).length !== 0;
            const hasP = this.pvalue_col !== null;
            return hasVariant && hasP;
        },
        parser() {
            if (this.isValid) {
                return makeParser(this.parserOptions);
            }
            return () => {
            };
        },
        preview() {
            try {
                return this.parser(this.sample_data);
            } catch (e) {
                return { error: 'Could not parse column contents' };
            }
        },
    },
    methods: {
        sendOptions() {
            // The preview (first line of file) will set the default locus (view) for this data
            const init_position = this.preview.position;
            const init_state = {
                chr: this.preview.chromosome,
                start: Math.min(0, init_position - 250000),
                end: init_position + 250000,
            };
            this.$emit('config-ready', Object.assign({}, this.parserOptions), init_state);
            this.$emit('close');
        },
    },
    components: {
        bsTab,
        bsTabs,
    },
};
</script>

<style scoped>
  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .5);
    display: table;
    transition: opacity .3s ease;
  }

  .modal-wrapper {
    display: table-cell;
    vertical-align: middle;
  }

  .modal-container {
    width: 800px;
    height: 85%;
    overflow-y: auto;
    margin: 0px auto;
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
</style>
