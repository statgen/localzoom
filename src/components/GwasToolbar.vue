<script>
import bsDropdown from 'bootstrap-vue/es/components/dropdown/dropdown';
import bsDropdownItem from 'bootstrap-vue/es/components/dropdown/dropdown-item';

import AdderWizard from './AdderWizard.vue';
import RegionPicker from './RegionPicker.vue';
import TabixFile from './TabixFile.vue';
import TabixUrl from './TabixUrl.vue';

export default {
    name: 'gwas-toolbar',
    props: {
        // Limit how many studies can be added (due to browser performance)
        max_studies: { type: Number, default: 3 },
        // Toolbar can optionally consider a list of studies already on plot
        study_names: { type: [Array, null], default: null },
    },
    data() {
        return {
            // Whether to show the "add a gwas" UI
            show_modal: false,
            num_studies_added: 0,

            // Control display of success/failure messages from this or child components
            message: '',
            message_class: '',

            // Temporary internal state
            file_reader: null,
            display_name: null, // TODO: replace 2 way binding with bubbling name up separately

            // Allow the user to customize the plot and select featured annotations
            has_catalog: false,
            has_credible_sets: false,
            build: 'GRCh37',
        };
    },
    computed: {
        study_count() {
            return this.study_names ? this.study_names.length : this.num_studies_added;
        },
    },
    methods: {
        reset() {
            // Reset state in the component
            this.file_reader = null;
            this.display_name = null;
            this.showMessage('', '');
        },
        showMessage(message, style = 'text-danger') {
            this.message = message;
            this.message_class = style;
        },
        selectRange(config) {
            this.showMessage('', '');
            this.$emit('select-range', config);
        },
        connectReader(reader, name) {
            this.file_reader = reader;
            this.display_name = name;
            this.show_modal = true;
        },
        sendConfig(parser_options, state) {
            // This particular app captures reader options for display, then relays them to the plot
            this.num_studies_added += 1;
            const annotations = {
                gwas_catalog: this.has_catalog,
                credible_sets: this.has_credible_sets,
            };
            const { build } = this;
            // Event signature:
            //  source_options={label, reader, parser_config},
            //  plot_options={annotations, state}
            this.$emit(
                'config-ready', // TODO: Structure this into a defined type
                {
                    label: this.display_name,
                    reader: this.file_reader,
                    parser_config: parser_options,
                },
                {
                    annotations,
                    build,
                    state: Object.assign({ genome_build: this.build }, state),
                },
            );
            this.reset();
        },
    },
    components: {
        bsDropdown,
        bsDropdownItem,
        AdderWizard,
        RegionPicker,
        TabixFile,
        TabixUrl,
    },
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col-sm-6">
        <div v-if="study_count < max_studies">
          <tabix-file class="mr-1"
                      @ready="connectReader" @fail="showMessage" />
          <bs-dropdown text="Add from URL" variant="success">
            <div class="px-3">
              <tabix-url @ready="connectReader" @fail="showMessage" />
            </div>
          </bs-dropdown>
          <adder-wizard v-if="show_modal"
                        :file_reader="file_reader"
                        :file_name.sync="display_name"
                        @ready="sendConfig"
                        @close="show_modal = false" />
        </div>
      </div>
      <div class="col-sm-6">
        <region-picker v-if="study_count"
                       @ready="selectRange"
                       @fail="showMessage" class="float-right"
                       :build="build"
                       search_url="https://portaldev.sph.umich.edu/api_internal_dev/v1/annotation/omnisearch/" />
        <bs-dropdown v-else text="Plot options" variant="info"
                     class="float-right">
          <div class="px-3">
            <strong>Annotations</strong><br>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="show-catalog"
                     v-model="has_catalog">
              <label class="form-check-label" for="show-catalog">GWAS Catalog</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="show-credible-set"
                     v-model="has_credible_sets">
              <label class="form-check-label" for="show-credible-set">95% credible set</label>
            </div>
            <strong>Genome Build</strong><br>
            <div class="form-check">
              <input class="form-check-input" type="radio" id="build-37"
                     name="build" value="GRCh37" v-model="build">
              <label class="form-check-label" for="build-37">GRCh37</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" id="build-38"
                     name="build" value="GRCh38" v-model="build">
              <label class="form-check-label" for="build-38">GRCh38</label>
            </div>
          </div>
        </bs-dropdown>
      </div>
    </div>
    <div class="row" v-if="message">
      <div class="col-sm-12"><span :class="[message_class]">{{message}}</span></div>
    </div>
  </div>
</template>

<style>
</style>

