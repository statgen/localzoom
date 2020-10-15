<script>
import { BDropdown } from 'bootstrap-vue/esm/';

import AdderWizard from './AdderWizard.vue';
import BatchSpec from './BatchSpec.vue';
import BatchScroller from './BatchScroller.vue';
import RegionPicker from './RegionPicker.vue';
import TabixFile from './TabixFile.vue';
import TabixUrl from './TabixUrl.vue';

const MAX_REGION_SIZE = 1000000;

export default {
    name: 'GwasToolbar',
    components: {
        BDropdown,
        AdderWizard,
        BatchScroller,
        BatchSpec,
        RegionPicker,
        TabixFile,
        TabixUrl,
    },
    props: {
        // Limit how many studies can be added (due to browser performance)
        max_studies: {
            type: Number,
            default: 3,
        },
        // Toolbar can optionally consider a list of studies already on plot
        study_names: {
            type: [Array, null],
            default: () => [],
        },
    },
    data() {
        return {
            // make constant available
            max_region_size: MAX_REGION_SIZE,

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

            // Controls for "batch view" mode
            batch_mode_active: false,
            batch_mode_regions: [],
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
            this.batch_mode_active = false;
            this.batch_mode_regions = [];
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
            if (this.study_names.includes(name)) {
                this.showMessage('A study with this name has already been added to the plot');
                return;
            }
            this.file_reader = reader;
            this.display_name = name;
            this.show_modal = true;
            this.showMessage('');
        },
        activateBatchMode(regions) {
            this.batch_mode_active = true;
            this.batch_mode_regions = regions;
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
};
</script>

<template>
  <div>
    <div class="row">
      <div
        v-if="!batch_mode_active"
        class="col-sm-6">
        <div v-if="study_count < max_studies">
          <tabix-file
            class="mr-1"
            @ready="connectReader"
            @fail="showMessage"/>
          <b-dropdown
            text="Add from URL"
            variant="success">
            <div class="px-3">
              <tabix-url
                @ready="connectReader"
                @fail="showMessage"/>
            </div>
          </b-dropdown>
          <adder-wizard
            v-if="show_modal"
            :file_reader="file_reader"
            :file_name.sync="display_name"
            @ready="sendConfig"
            @close="show_modal = false"/>
        </div>
      </div>
      <div
        v-if="!batch_mode_active"
        class="col-sm-6">
        <div
          v-if="study_count"
          class="d-flex justify-content-end">
          <region-picker
            :build="build"
            :max_range="max_region_size"
            search_url="https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/"
            @ready="selectRange"
            @fail="showMessage"/>
          <batch-spec
            :max_range="max_region_size"
            class="ml-1"
            @ready="activateBatchMode"/>
        </div>
        <b-dropdown
          v-else
          text="Plot options"
          variant="info"
          class="float-right">
          <div class="px-3">
            <strong>Annotations</strong><br>
            <div class="form-check form-check-inline">
              <input
                id="show-catalog"
                v-model="has_catalog"
                class="form-check-input"
                type="checkbox">
              <label
                class="form-check-label"
                for="show-catalog">GWAS Catalog</label>
            </div>
            <div class="form-check form-check-inline">
              <input
                id="show-credible-set"
                v-model="has_credible_sets"
                class="form-check-input"
                type="checkbox">
              <label
                class="form-check-label"
                for="show-credible-set">95% credible set</label>
            </div>
            <strong>Genome Build</strong><br>
            <div class="form-check">
              <input
                id="build-37"
                v-model="build"
                class="form-check-input"
                type="radio"
                name="build"
                value="GRCh37">
              <label
                class="form-check-label"
                for="build-37">GRCh37</label>
            </div>
            <div class="form-check">
              <input
                id="build-38"
                v-model="build"
                class="form-check-input"
                type="radio"
                name="build"
                value="GRCh38">
              <label
                class="form-check-label"
                for="build-38">GRCh38</label>
            </div>
          </div>
        </b-dropdown>
      </div>

      <div
        v-if="batch_mode_active"
        class="col-md-12">
        <batch-scroller
          :regions="batch_mode_regions"
          @navigate="selectRange"
          @cancel="batch_mode_active = false"/>
      </div>
      <div
        v-if="message"
        class="row">
        <div class="col-sm-12"><span :class="[message_class]">{{ message }}</span></div>
      </div>
    </div>
  </div>
</template>

<style>
</style>
