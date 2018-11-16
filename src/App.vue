<template>
  <div>
    <div v-if="studyCount < maxStudies">
      <tabix-file @connected="connectReader" class="float-left mr-3"></tabix-file>
      <adder-wizard v-if="showModal"
                    :file_reader="fileReader"
                    :file_name.sync="displayName"
                    @config-ready="sendConfig"
                    @close="showModal = false"></adder-wizard>
    </div>
    <region-picker v-if="studyCount" class="float-right"></region-picker>
    <bs-dropdown v-if="!studyCount" text="Plot options"  variant="info"
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
            <label class="form-check-label" for="show-credible-set">Credible sets</label>
          </div>
          <strong>Genome Build</strong><br>
          <div class="form-check">
            <input class="form-check-input" type="radio" id="build-37"
                   name="build" value="37" v-model="build">
            <label class="form-check-label" for="build-37">GRCh37</label>
          </div>
          <div class="form-check">
            <input class="form-check-input" type="radio" id="build-38"
                   name="build" value="38" v-model="build">
            <label class="form-check-label" for="build-38">GRCh38</label>
          </div>
        </div>
      </bs-dropdown>
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
            maxStudies: 3,

            // Temporary state
            fileReader: null,
            displayName: null,

            // Annotations
            hasCatalog: false,
            hasCredibleSets: false,
            // Other plot options
            build: 37,
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
        sendConfig(parser_options, state) {
            // This particular app captures reader options for display, then relays them to the plot
            this.studyCount += 1;
            const annotations = {
                gwas_catalog: this.hasCatalog,
                credible_sets: this.hasCredibleSets,
            };
            const build = +this.build;
            // Event signature:
            //  source_options={label, reader, parser_config},
            //  plot_options={annotations, state}
            this.$root.$emit(
                'config-ready',
                { label: this.displayName, reader: this.fileReader, parser_config: parser_options },
                {
                    annotations,
                    build,
                    state: Object.assign({ genome_build: build }, state),
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
    },
};
</script>

<style>
</style>
