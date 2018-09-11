<!-- A modal dialog window -->
<!-- See: https://vuejs.org/v2/examples/modal.html -->
<template>
  <transition name="modal">
    <div class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>Add a GWAS</h3><button class="pull-right" aria-label="close"
                                       @click="$emit('close')">X</button>
          </div>

          <div class="modal-body">
            <!-- TODO: Improve state management/ transition code -->
            <div v-if="currentPage === 'select_source'">
              <!--Workflow stage 1: "pick a dataset to add" -->
              <div v-if="!adderMode">
                <p>How would you like to load your data?</p>
                <div class="text-center">
                  <button class="btn btn-info" @click="adderMode = 'file'">
                    Local file
                  </button><br>
                  or<br>
                  <button class="btn btn-info" @click="adderMode = 'url'">
                    Remote URL
                  </button>
                </div>
              </div>
              <div v-else-if="adderMode === 'file'">
                <tabix-file @connected="connectReader"></tabix-file>
              </div>
              <div v-else-if="adderMode === 'url'">
                <tabix-url @connected="connectReader"></tabix-url>
              </div>
            </div>
            <div v-else-if="currentPage === 'select_options'">
              <!-- Workflow stage 2: select parser options -->
              <parser-options :chr_col="readerChrCol" :pos_col="readerPosCol"
                              :column_titles="readerHeaders" :sample_data="readerDataRow"
                              @connected="connectParser"></parser-options>
            </div>
            <div v-else-if="currentPage === 'accept_options'">
              <label>Name: <input class="form-control" type="text" v-model="previewName"></label>
              <!-- Workflow stage 3: Add to plot (TODO: In future, add a preview mode) -->
              <button class="btn btn-primary" @click="sendOptions">
                Add to plot
              </button>
            </div>
            <div v-else class="text-error">
              You have reached this page in error. Please report this message to our developers.
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import ParserOptions from './ParserOptions.vue';
import TabixFile from './TabixFile.vue';
import TabixUrl from './TabixUrl.vue';

export default {
    name: 'adder-wizard',
    data() {
        return {
            // Pages: select_source, select_options, accept_options
            currentPage: 'select_source',
            readerHeaders: [],
            readerDataRow: '',
            // Which type of "add a gwas" reader to select: file, url, or null
            adderMode: null,
            // Track choices made by a user, and coordinate between components
            previewReader: null,
            previewName: null,
            previewParserOptions: {},
        };
    },
    watch: {
        previewReader() {
            // Uses a watcher to resolve async value fetch.
            // Not every tabix file represents column header data in the same way: in some, it's
            //  the last line with a comment (meta) character. In others, there is no meta char, so
            //  we use the last line that was skipped
            // Fetch 25 rows of data. The last skipped line is assumed to be column headers;
            //  the last total line is assumed to be data.
            // This wizard assumes all files are tabix (tab delimited)

            if (!this.previewReader.skip) {
                // No lines skipped, grab last "true" header
                this.previewReader.fetchHeader((rows, err) => {
                    // TODO: Incorporate proper meta char
                    this.readerHeaders = rows[rows.length - 1].replace(/^#+/g, '').split('\t');
                });
            }
            this.previewReader.fetchHeader((rows, err) => {
                // Read data (and last-ditch attempt to find headers, if necessary)
                if (this.previewReader.skip) {
                    // TODO: Incorporate proper meta char
                    this.readerHeaders = rows[this.previewReader.skip - 1].replace(/^#+/g, '').split('\t');
                }
                this.readerDataRow = rows[rows.length - 1]; // Give line parser a raw string
            }, { nLines: 25, metaOnly: false });
        },
    },
    computed: {
        readerChrCol() { return this.previewReader.colSeq - 1; },
        readerPosCol() { return this.previewReader.colStart - 1; },
    },
    methods: {
        connectReader(reader, name) {
            this.previewReader = reader;
            // LZ tooltip templates break if the data source name has special chars; strip
            this.previewName = name.replace(/[^A-Za-z0-9_]/g, '_');
            this.currentPage = 'select_options';
        },
        connectParser(params) {
            this.previewParserOptions = params;
            this.currentPage = 'accept_options';
        },
        sendOptions() {
            const { previewName, previewReader, previewParserOptions } = this;
            this.$emit('config-ready', previewName, previewReader, Object.assign({}, previewParserOptions));
            this.$emit('close');
        },
    },
    components: {
        TabixUrl,
        TabixFile,
        ParserOptions,
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
    height: 75%;
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
