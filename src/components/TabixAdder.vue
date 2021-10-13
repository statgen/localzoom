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
            data_type: 'gwas',
            tabix_gz_url: '',
        };
    },
    methods: {
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

        createReader() {
            // Create a reader. Emit EITHER:
            //  - Success: (reader, filename, filetype)
            //  - Failure: Text error message to display
            // Send a reader instance based on local/remote and filetype config options
            const { tabix_mode, data_type } = this;
            let reader_promise;
            if (tabix_mode === 'file') {
                reader_promise = this._fromFile();
            } else if (tabix_mode === 'url') {
                reader_promise = this._fromURL();
            } else {
                throw new Error('Cannot create reader from unknown mode');
            }

            reader_promise.then(([reader, name]) => {
                this.$emit('ready', reader, name, data_type);
            }).catch((err) => this.$emit('fail', err)
            ).finally(() => this.$refs.options_dropdown.hide());
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
            type="file"
            multiple
            accept="application/gzip,.tbi"
            class="form-control"
          >
        </template>
        <template v-else>
          <input
            v-model.trim="tabix_gz_url"
            type="url"
            class="form-control"
            placeholder="Specify URL...">
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

        <input
          type="submit"
          class="btn btn-success"
          value="Add dataset">
      </form>
    </div>
  </b-dropdown>
</template>
