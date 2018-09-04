<template>
  <div id="app">
    <region-picker v-if="selections.length"></region-picker>
    <!-- Always show: list of connected datasets, option to add one -->
    <h3>Your studies</h3>
    <studies-vlist :items="selections"></studies-vlist>

    <button class="button"
            v-if="!isExpanded" @click="setProperty('isExpanded', true)">Add a dataset</button>

    <div v-if="isExpanded">
      <h3>Add a GWAS (<a role="button"
                         @click="resetState(); setProperty('isExpanded', false)">cancel</a>)</h3>
        <!--Workflow stage 1: "pick a dataset to add" -->
        <div v-if="!adderMode">
          <p>How would you like to load your data?</p>
          <button class="button-primary" @click="setProperty('adderMode', 'file')">
            From a local file
          </button>
          <button class="button-primary" @click="setProperty('adderMode', 'url')">
            From a remote URL
          </button>
        </div>
        <div v-else-if="adderMode === 'file'">
          <tabix-file @connected="connectReader"></tabix-file>
        </div>
        <div v-else-if="adderMode === 'url'">
          <tabix-url @connected="connectReader"></tabix-url>
        </div>
        <!-- Workflow stage 2: "select parser options" -->
        <div v-if="previewReader">
          <tabix-options @connected="connectParser"></tabix-options>
        </div>

        <!-- Workflow stage 3: The magical "plot now" button. -->
        <!-- TODO: Add a "preview" mode that uses the Tabix reader data (first few rows) to
         demonstrate sample of parsed data -->
        <div v-if="Object.keys(previewParserOptions).length">
          <button class="button-primary" @click="sendToPlot">
            Add to plot
          </button>
        </div>
    </div>

  </div>
</template>

<script>
import RegionPicker from './components/region-picker.vue';
import StudiesVlist from './components/studies-vlist.vue';
import TabixFile from './components/TabixFile.vue';
import TabixUrl from './components/TabixUrl.vue';
import TabixOptions from './components/TabixOptions.vue';

// eslint-disable-next-line no-unused-vars
export default {
    name: 'gwas-chooser',
    data() {
        return {
            // Whether to show the "add a gwas" UI
            isExpanded: false,
            // Which type of "add a gwas" reader to select: file, url, or null
            adderMode: null,
            // Track choices made by a user. This is for the current preview mode (many readers can
            // be connected, so clear after each panel has been added)
            previewReader: null,
            previewName: null,
            previewParserOptions: {},
            // Many GWAS selections can be added. Track a list of chosen GWASs (by filename)
            selections: [],
        };
    },
    methods: {
        resetState() {
            // Reset "add a gwas" UI
            this.isExpanded = false;
            this.adderMode = null;
            this.previewName = null;
            this.previewReader = null;
            this.previewParserOptions = {};
        },
        setProperty(name, value) {
            this[name] = value;
        },
        connectReader(reader, name) {
            this.previewReader = reader;
            this.previewName = name;
        },
        connectParser(params) {
            // TODO: Create a "preview mode" UI (before using LZ plot)
            this.previewParserOptions = params;
        },
        sendToPlot() {
            const { previewName, previewReader, previewParserOptions } = this;
            this.selections.push(previewName);
            this.$root.$emit('config-ready', previewName, previewReader, Object.assign({}, previewParserOptions));

            // Reset component state for next addition
            this.resetState();
        },
    },
    components: {
        StudiesVlist,
        RegionPicker,
        TabixUrl,
        TabixFile,
        TabixOptions,
    },
};
</script>

<style>
</style>
