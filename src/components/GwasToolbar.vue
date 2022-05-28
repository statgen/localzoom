<script>
import { BDropdown } from 'bootstrap-vue/src/';

import BatchSpec from './BatchSpec.vue';
import BatchScroller from './BatchScroller.vue';
import GwasParserOptions from './GwasParserOptions.vue';
import RegionPicker from './RegionPicker.vue';
import TabixAdder from './TabixAdder.vue';

import { createStudySources, createStudyLayouts } from '../util/lz-helpers';
import { MAX_REGION_SIZE } from '../util/constants';


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
        genome_build: {
            type: String,
            default: 'GRCh37',
        },
        // Limit how many studies can be added (due to browser performance)
        max_studies: {
            type: Number,
            default: 6,
        },
        // Track a list of studies that were added to the plot. Useful to prevent duplicates.
        known_tracks: {
            type: Array,
            default: () => [], // Each item is object of form { type, filename, display_name }
        },
        // Get a list of suggested entries for batch mode (useful in my.locuszoom.org, which pre-calculates top loci genome wide)
        //  Should fetch pre-computed top loci, and return list of [ {chr, start, end} ] entries
        batch_region_getter: { type: Function, default: null },
    },
    data() {
        return {
            // make constant available
            max_region_size: MAX_REGION_SIZE,

            // Control display of success/failure messages from this or child components
            message: '',
            message_class: '',

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

            const { genome_build } = this;


            const track_sources = createStudySources(data_type, reader, filename, parser_func);
            const panel_layouts = createStudyLayouts(data_type, filename, display_name);
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
            :allow_ld="study_count > 0"
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
            @ready="activateBatchMode">
            <template v-if="batch_region_getter" #preset-button="{updateRegions}">
              <button class="btn btn-warning" @click="updateRegions(batch_region_getter())">Get top hits</button>
            </template>
          </batch-spec>
        </div>
        <b-dropdown
          v-else
          text="Genome Build"
          variant="info"
          class="float-right">
          <div class="px-3">
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
