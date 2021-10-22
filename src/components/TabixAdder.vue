<script>
/**
 * Add tabixed data (from file or URL), along with a tag identifying the type of data to be added
 */
import { BDropdown, BFormGroup, BFormRadio, BFormRadioGroup } from 'bootstrap-vue/src/';
import { makeBed12Parser, makeGWASParser, makePlinkLdParser } from 'locuszoom/esm/ext/lz-parsers';
import { blobReader, urlReader } from 'tabix-reader';

import GwasParserOptions from './GwasParserOptions.vue';
import { positionToStartRange } from '../util/entity-helpers';


export default {
    name: 'TabixAdder',
    components: { BDropdown, BFormGroup, BFormRadio, BFormRadioGroup, GwasParserOptions },
    props: {
        // Allow the user to add custom LD
        allow_ld: { type: Boolean, default: false },
    },
    data() {
        return {
            tabix_mode: 'file',
            display_name: '',
            data_type: 'gwas',
            tabix_gz_url: '',
            // Options required to pass props to the GWAS modal
            filename: '',
            show_gwas_modal: false,
            tabix_reader: null,
        };
    },
    methods: {
        reset() {
            // Note: Deliberately don't reset datatype, for workflows of "add more of the same"
            // User input fields
            this.display_name = '';
            this.tabix_gz_url = '';

            // Things used internally
            this.filename = '';
            this.tabix_reader = null;
            this.show_gwas_modal = false;
        },

        updateDisplayName() {
            const  {display_name, tabix_mode, tabix_gz_url} = this;
            if (display_name) {
                // Only auto-suggest a display name if one was not already entered
                return;
            }

            let short_name;
            if (tabix_mode === 'file') {
                const { files } = this.$refs.file_picker;
                if (!files.length) {
                    return;
                }
                let base_name = files[0].name;
                short_name = (base_name.substring(0, base_name.lastIndexOf('.')) || base_name);
            } else if (tabix_mode === 'url') {
                if (!tabix_gz_url) {
                    return;
                }
                try {
                    short_name = new URL(tabix_gz_url).pathname.split('/').pop().replace(/\.gz|.bgz|\.tbi/gi, '');
                } catch (e) {
                    // Form validation should handle malformed URLs
                    return;
                }
                short_name = short_name !== '/' ? short_name : tabix_gz_url;
            }
            this.display_name = short_name;
        },

        _fromURL() {
            const { tabix_gz_url } = this;
            const index_url = `${tabix_gz_url}.tbi`;
            // Suggested dataset label is last part of url path, stripped of file extensions
            const name = tabix_gz_url.split('/').pop().replace(/\.gz|.bgz|\.tbi/gi, '');
            return urlReader(tabix_gz_url, index_url)
                .then((reader) => [reader, name]);
        },

        _fromFile() {
            const { files } = this.$refs.file_picker;

            let tabix_file;
            let gwas_file;
            for (let i = 0; i < files.length; i++) {
                const f = files.item(i);
                if (f.name.endsWith('.tbi')) {
                    tabix_file = f;
                } else {
                    gwas_file = f;
                }
            }
            if (files.length !== 2 || !tabix_file) {
                return Promise.reject('Must select two files: gzipped data and accompanying tabix index');
            }
            const name = tabix_file.name.replace(/\.gz|\.tbi/gi, '');
            return blobReader(gwas_file, tabix_file)
                .then((reader) => [reader, name]);
        },

        suggestRegion(data_type, reader, parser) {
            // Note; the GWAS modal does this for GWAS data internally.
            return new Promise((resolve, reject) => {
                if (data_type === 'bed') {
                    // 1. Find headers (has tabs, does not begin with "browser", "track", or comment mark)
                    // 2. Get first data row and return the coordinates for that row. This method assumes the LZ parser with field names according to UCSC BED spec
                    const header_prefixes = /^(browser | track |#)/;
                    const _isBedHeader = (text) => !text.includes('\t') || header_prefixes.test(text);
                    const data_callback = (rows, err) => {
                        let valid_file = true;
                        if (!rows.length || err) {
                            valid_file = false;
                        }
                        // Some tabix files manually specify rows to skip (-S); otherwise tabix auto-ignores `#` lines and we need to figure out what the headers are manually
                        let first_data_index = reader.skip ? reader.skip : rows.findIndex((text) => !_isBedHeader(text));
                        if (!valid_file || first_data_index === -1) {
                            reject('Could not find data rows. Check that file is non-empty and tbi is valid');
                        }
                        let first_row = rows[first_data_index];
                        try {
                            first_row = parser(first_row);
                        } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error(`Could not parse BED file. Error message below: \n${e}`);
                            console.error(e);
                            reject('Parse error. See JS console for details.');
                        }
                        let { chrom: chr, chromStart: start, chromEnd: end } = first_row;
                        [start, end] = positionToStartRange((start + end) / 2);

                        resolve({chr, start, end});
                    };

                    reader.fetchHeader(data_callback, {
                        nLines: 30,
                        metaOnly: false,
                    });
                } else {
                    // Not implemented for other datatypes
                    return {};
                }
            });

        },

        createReader(event) {
            // Create a reader when the form is submitted. Emit EITHER:
            //  - Success: (datatype, reader, filename, label)
            //  - Failure: Text error message to display
            // Send a reader instance based on local/remote and filetype config options
            event.target.checkValidity();

            const { tabix_mode, data_type, display_name } = this;
            let reader_promise;
            if (tabix_mode === 'file') {
                reader_promise = this._fromFile();
            } else if (tabix_mode === 'url') {
                reader_promise = this._fromURL();
            } else {
                throw new Error('Cannot create reader from unknown mode');
            }

            reader_promise.then(([reader, filename]) => {
                if (data_type === 'gwas') {
                    // GWAS files are very messy, and so knowing where to find the file is not enough.
                    // After receiving the reader, we need to ask the user how to parse the file. (via UI)
                    if (filename.includes('.bed')) {
                        // Check in case the user does something unwise. (2500 unique BED lines would be bad!)
                        throw new Error('Selected datatype GWAS does not match file extension .bed');
                    }

                    this.filename = filename;
                    this.tabix_reader = reader;
                    this.show_gwas_modal = true;
                } else {
                    // All other data types are quasi-standardized, and hence we can declare this
                    //  new track immediately after verifying that a valid reader exists
                    let parser;
                    if (data_type === 'bed') {
                        parser = makeBed12Parser({normalize: true});
                        if (!filename.includes('.bed')) {
                            throw new Error('BED interval file names must include extension .bed');
                        }
                    } else if (data_type === 'plink_ld') {
                        parser = makePlinkLdParser({normalize: true});
                    } else {
                        throw new Error('Unrecognized datatype');
                    }
                    return this.suggestRegion(data_type, reader, parser)
                        .then((region_config) => {
                            this.sendTrackOptions(data_type, reader, parser, filename, display_name, region_config);
                            this.reset();
                        });
                }
            }).catch((err) => {
                this.$emit('fail', err);
                this.reset();
            }).finally(() => {
                this.$refs.options_dropdown.hide();
            });
        },

        receiveGwasOptions(parser_config, region_config) {
            const { tabix_reader, filename, display_name } = this;
            // Receive GWAS options and declare a new track for this datatype
            const parser = makeGWASParser(parser_config);
            this.sendTrackOptions('gwas', tabix_reader, parser, filename, display_name, region_config);
            this.reset();
        },

        sendTrackOptions(data_type, reader, parser, filename, display_name, metadata = {}) {
            this.$emit('ready', ...arguments);
            this.reset();
        },
    },
};
</script>

<template>
  <div>
    <b-dropdown
      ref="options_dropdown"
      :lazy="true"
      text="Add tabix-indexed datafile"
      variant="success"
    >
      <div
        class="px-3"
        style="width: 300px;">
        <form @submit.prevent="createReader">
          <b-form-group label="Data source">
            <b-form-radio-group
              id="tabix-location"
              v-model="tabix_mode"
              :options="[{text: 'File', value: 'file'}, {text: 'URL', value: 'url'}]"
              name="tabix-location"
            />
          </b-form-group>

          <template v-if="tabix_mode === 'file'">
            <input
              ref="file_picker"
              :required="tabix_mode === 'file'"
              type="file"
              multiple
              accept="application/gzip,.tbi"
              class="form-control"
              @change="updateDisplayName"
            >
          </template>
          <template v-else>
            <input
              v-model.trim="tabix_gz_url"
              :required="tabix_mode === 'url'"
              type="url"
              class="form-control"
              placeholder="Specify URL..."
              @blur="updateDisplayName"
            >
          </template><br>

          <b-form-group label="Type">
            <b-form-radio
              v-model="data_type"
              name="data-type"
              value="gwas"
            >
              GWAS scatter plot (<small><a
                href="https://my.locuszoom.org/about/#prepare-data"
                target="_blank"
              >suggested fields</a></small>)
            </b-form-radio>
            <b-form-radio
              v-model="data_type"
              name="data-type"
              value="bed"
            >
              BED 4+ intervals <small>(<a
                href="https://genome.ucsc.edu/FAQ/FAQformat.html#format1"
                target="_blank"
              >file format</a>)</small>
            </b-form-radio>
            <b-form-radio
              v-if="allow_ld"
              v-model="data_type"
              name="data-type"
              value="plink_ld"
            >
              PLINK 1.9 LD
            </b-form-radio>
          </b-form-group>

          <b-form-group label="Track Label">
            <input
              v-model.trim="display_name"
              type="text"
              required
              class="form-control"
              @blur="updateDisplayName"
            >
          </b-form-group>

          <input
            type="submit"
            class="btn btn-success"
            value="Add dataset">
        </form>
      </div>
    </b-dropdown>
    <gwas-parser-options
      v-if="show_gwas_modal"
      :file_reader="tabix_reader"
      @ready="receiveGwasOptions"
      @close="show_gwas_modal = false"/>
  </div>
</template>
