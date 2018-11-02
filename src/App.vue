<template>
  <div>
    <region-picker v-if="studyCount"></region-picker>

    <div v-if="!studyCount">
      <tabix-file @connected="connectReader" class="float-left"></tabix-file>
      <adder-wizard v-if="showModal"
              :file_reader="fileReader"
              :file_name.sync="displayName"
              @config-ready="sendConfig" @close="showModal = false"></adder-wizard>
      <bs-dropdown text="Plot options"  variant="info"
                   class="float-right">
        <div class="px-3">
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="show-catalog"
                   v-model="hasCatalog">
            <label class="form-check-label" for="show-catalog">GWAS Catalog</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="show-credible-set"
                   v-model="hasCredibleSets">
            <label class="form-check-label" for="show-credible-set">Credible sets</label>
          </div>
        </div>
      </bs-dropdown>
    </div>
  </div>
</template>

<script>

import bsDropdown from 'bootstrap-vue/es/components/dropdown/dropdown';
import bsDropdownItem from 'bootstrap-vue/es/components/dropdown/dropdown-item';

import AdderWizard from './components/AdderWizard.vue';
import TabixFile from './components/TabixFile.vue';
import RegionPicker from './components/RegionPicker.vue';


export default {
    name: 'gwas-chooser',
    data() {
        return {
            // Whether to show the "add a gwas" UI
            showModal: false,
            // Many GWAS selections can be added. Track a list of chosen GWASs (by filename)
            studyCount: 0,

            // Temporary state
            fileReader: null,
            displayName: null,

            hasCatalog: true,
            hasCredibleSets: true,
        };
    },
    methods: {
        reset() {
            // Reset state in the component
            this.fileReader = null;
            this.displayName = null;
        },
        connectReader(reader, name) {
            this.fileReader = reader;
            this.displayName = name;
            this.showModal = true;
        },
        sendConfig(parser_options, initial_state) {
            // This particular app captures reader options for display, then relays them to the plot
            this.studyCount += 1;
            const annotations = {
                gwas_catalog: this.hasCatalog,
                credible_sets: this.hasCredibleSets,
            };
            // Event signature:
            //  source_options={label, reader, parser_config},
            //  plot_options={annotations, state}
            this.$root.$emit(
                'config-ready',
                { label: this.displayName, reader: this.fileReader, parser_config: parser_options },
                { annotations, state: initial_state },
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
    },
};
</script>

<style>
</style>
