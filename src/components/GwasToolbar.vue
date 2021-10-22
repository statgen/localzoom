<script>
import { BDropdown } from 'bootstrap-vue/src/';

import BatchSpec from './BatchSpec.vue';
import BatchScroller from './BatchScroller.vue';
import GwasParserOptions from './GwasParserOptions.vue';
import RegionPicker from './RegionPicker.vue';
import TabixAdder from './TabixAdder.vue';

import { createStudySources, createStudyLayouts } from '../util/lz-helpers';

const MAX_REGION_SIZE = 1000000;

export default {
    name: 'GwasToolbar',
    components: {
        BDropdown,
        GwasParserOptions,
        BatchScroller,
        BatchSpec,
        RegionPicker,
        TabixAdder,
    },
    props: {
        // These two fields are sync bindings (this component notifies its parent of changes)
        genome_build: {
            type: String,
            default: 'GRCh37',
        },
        has_credible_sets: {
            type: Boolean,
            default: true,
        },
        // Limit how many studies can be added (due to browser performance)
        max_studies: {
            type: Number,
            default: 6,
        },
        // Track a list of studies that were added to the plot. Useful to prevent duplicates.
        // TODO: move to live-binding provide/inject to support export widget / my.locuszoom.org ?
        known_tracks: {
            type: Array,
            default: () => [], // Each item is object of form { type, filename, display_name }
        },
    },
    data() {
        return {
            // make constant available
            max_region_size: MAX_REGION_SIZE,

            // Control display of success/failure messages from this or child components
            message: '',
            message_class: '',

            // Allow the user to customize the plot and select featured annotations.
            has_gwas_catalog: true,

            // Controls for "batch view" mode
            batch_mode_active: false,
            batch_mode_regions: [],
        };
    },
    computed: {
        study_count() {
            return this.known_tracks.length;
        },
        // Certain props are passed in with sync bindings (this component is intended to modify its parent).
        //   Allow form to mirror parent state without weird errors.
        i_genome_build: {
            get: function() {
                return this.genome_build;
            },
            set: function(newValue) {
                this.$emit('update:genome_build', newValue);
            },
        },
        i_has_credible_sets: {
            get: function() {
                return this.has_credible_sets;
            },
            set: function(newValue) {
                this.$emit('update:has_credible_sets', newValue);
            },
        },
    },
    methods: {
        reset() {
            // Reset state in the component TODO: Why are we setting batch mode when a track is added? Also how?
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

        /**
         * Adding a new tabix reader track can go through one of two workflows:
         *   - How to parse the file can be inferred from type; render immediately
         *   -
         */
        receiveTabixReader(data_type, reader, parser_func, filename, display_name, metadata) {
            this.showMessage('');

            const already_exists = this.known_tracks.find(({data_type: kt, filename: kf}) => kf === filename && kt === data_type);
            if (already_exists) {
                this.showMessage('A study with this name has already been added to the plot');
                return;
            }

            const { genome_build, has_gwas_catalog, has_credible_sets } = this;


            const track_sources = createStudySources(data_type, reader, filename, parser_func);
            const panel_layouts = createStudyLayouts(data_type, filename, display_name, {has_gwas_catalog, has_credible_sets});
            const new_plot_state = { genome_build, ...metadata };

            this.$emit('add-tabix-track', data_type, filename, display_name, track_sources, panel_layouts, new_plot_state);
            this.reset();
        },

        activateBatchMode(regions) {
            this.batch_mode_active = true;
            this.batch_mode_regions = regions;
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
          <tabix-adder
            :allow_ld="false"
            @ready="receiveTabixReader"
            @fail="showMessage"
          />


        </div>
      </div>
      <div
        v-if="!batch_mode_active"
        class="col-sm-6">
        <div
          v-if="study_count"
          class="d-flex justify-content-end">
          <region-picker
            :genome_build="genome_build"
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
                v-model="has_gwas_catalog"
                class="form-check-input"
                type="checkbox">
              <label
                class="form-check-label"
                for="show-catalog">GWAS Catalog</label>
            </div>
            <div class="form-check form-check-inline">
              <input
                id="show-credible-set"
                v-model="i_has_credible_sets"
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
                v-model="i_genome_build"
                class="form-check-input"
                type="radio"
                name="genome_build"
                value="GRCh37">
              <label
                class="form-check-label"
                for="build-37">GRCh37</label>
            </div>
            <div class="form-check">
              <input
                id="build-38"
                v-model="i_genome_build"
                class="form-check-input"
                type="radio"
                name="genome_build"
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
