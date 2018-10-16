<template>
  <div>
    <region-picker v-if="studyCount"></region-picker>

    <tabix-file @connected="connectReader"></tabix-file>
    <adder-wizard v-if="showModal"
                  :file_reader="fileReader"
                  :file_name.sync="fileName"
                  @config-ready="sendConfig" @close="showModal = false"></adder-wizard>

    <div class="row">
      <div class="col-md-12">
        <span class="form-control-static">Plot features: </span>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="checkbox" id="show-catalog" v-model="hasCatalog">
          <label class="form-check-label" for="show-catalog">GWAS Catalog</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="checkbox" id="show-credible-set"
                 v-model="hasCredibleSets">
          <label class="form-check-label" for="show-credible-set">Credible sets</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
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
            fileName: null,

            hasCatalog: false,
            hasCredibleSets: false,
        };
    },
    methods: {
        reset() {
            // Reset state in the component
            this.fileReader = null;
            this.fileName = null;
        },
        connectReader(reader, name) {
            this.fileReader = reader;
            // LZ tooltip templates break if the data source name has special chars; strip
            this.fileName = name.replace(/[^A-Za-z0-9_]/g, '_');
            this.showModal = true;
        },
        sendConfig(options) {
            // This particular app captures reader options for display, then relays them to the plot
            this.$root.$emit('config-ready', this.fileName, this.fileReader, options);
            this.reset();
        },
    },
    components: {
        AdderWizard,
        RegionPicker,
        TabixFile,
    },
};
</script>

<style>
</style>
