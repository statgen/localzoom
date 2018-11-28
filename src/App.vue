<template>
  <div>
    <div class="row">
      <div class="col-sm-6" v-if="studyCount < maxStudies">
        <tabix-file class="mr-1"
                    @connected="connectReader" @fail="showMessage" />
        <bs-dropdown text="Add from URL" variant="success">
          <div class="px-3">
            <tabix-url @connected="connectReader" @fail="showMessage" />
          </div>
        </bs-dropdown>
        <adder-wizard v-if="showModal"
                      :file_reader="fileReader"
                      :file_name.sync="displayName"
                      @config-ready="sendConfig"
                      @close="showModal = false" />
      </div>
      <div class="col-sm-6">
        <region-picker v-if="studyCount"
                       @fail="showMessage" class="float-right"
                       :build="build"
                       max_range="500000"
                       search_url="https://portaldev.sph.umich.edu/api_internal_dev/v1/annotation/omnisearch/" />
        <bs-dropdown v-else text="Plot options" variant="info"
                     class="float-right">
          <div class="px-3">
            <strong>Annotations</strong><br>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="show-catalog"
                     v-model="hasCatalog">
              <label class="form-check-label" for="show-catalog">GWAS Catalog</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" id="show-credible-set"
                     v-model="hasCredibleSets">
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
      <div class="col-sm-12"><span :class="[messageClass]">{{message}}</span></div>
    </div>
  </div>
</template>

<script>

import bsDropdown from 'bootstrap-vue/es/components/dropdown/dropdown';
import bsDropdownItem from 'bootstrap-vue/es/components/dropdown/dropdown-item';

import AdderWizard from './components/AdderWizard.vue';
import RegionPicker from './components/RegionPicker.vue';
import TabixFile from './components/TabixFile.vue';
import TabixUrl from './components/TabixUrl.vue';

export default {
    name: 'gwas-chooser',
    data() {
        return {
            // Whether to show the "add a gwas" UI
            showModal: false,
            // Limit how many studies can be added (due to browser performance)
            studyCount: 0,
            maxStudies: 3,

            // Control display of success/failure messages from this or child components
            message: '',
            messageClass: '',

            // Temporary state
            fileReader: null,
            displayName: null,

            // Annotations
            hasCatalog: false,
            hasCredibleSets: false,
            // Other plot options
            build: 'GRCh37',
        };
    },
    methods: {
        reset() {
            // Reset state in the component
            this.fileReader = null;
            this.displayName = null;
            this.message = '';
            this.messageClass = '';
        },
        showMessage(message, style = 'text-danger') {
            this.message = message;
            this.messageClass = style;
        },
        connectReader(reader, name) {
            this.fileReader = reader;
            this.displayName = name;
            this.showModal = true;
        },
        sendConfig(parser_options, state) {
            // This particular app captures reader options for display, then relays them to the plot
            this.studyCount += 1;
            const annotations = {
                gwas_catalog: this.hasCatalog,
                credible_sets: this.hasCredibleSets,
            };
            const { build } = this;
            // Event signature:
            //  source_options={label, reader, parser_config},
            //  plot_options={annotations, state}
            this.$root.$emit(
                'config-ready',
                { label: this.displayName, reader: this.fileReader, parser_config: parser_options },
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

<style>
</style>
