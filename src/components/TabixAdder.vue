<script>
/**
 * Add tabixed data (from file or URL), along with a tag identifying the type of data to be added
 */
import { BDropdown, BFormGroup, BFormRadio, BFormRadioGroup } from 'bootstrap-vue/src/';
import { blobReader, urlReader } from 'tabix-reader';


export default {
    name: 'TabixAdder',
    components: { BDropdown, BFormGroup, BFormRadio, BFormRadioGroup },
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
        };
    },
    methods: {
        reset() {
            this.display_name = '';
            this.tabix_gz_url = '';
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
                    short_name = new URL(tabix_gz_url).pathname;
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
                this.$emit('ready', data_type, reader, filename, display_name);
            }).catch((err) => this.$emit('fail', err)
            ).finally(() => {
                this.reset();
                this.$refs.options_dropdown.hide();
            });
        },
    },
};
</script>

<template>
  <b-dropdown
    ref="options_dropdown"
    :lazy="true"
    text="Add tabix-indexed datafile"
    variant="success">
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
            GWAS
          </b-form-radio>
          <b-form-radio
            v-model="data_type"
            name="data-type"
            value="bed"
          >
            BED 4+
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
</template>
