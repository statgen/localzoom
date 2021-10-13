<script>
/**
 * Allows user to designate a list of regions to plot. Handles parsing and selection of regions,
 *  which will then be consumed by another widget that handles cycling between those choices.
 */

import { BDropdown } from 'bootstrap-vue/src/';
import { parseRegion } from '../util/entity-helpers';

export default {
    name: 'BatchSpec',
    components: { BDropdown },
    props: {
        max_range: { type: Number, default: null },
    },
    data() {
        return {
            region_text: '',
            show_loader: false,
            message: null, // display validation errors
        };
    },
    methods: {
        getRegionsFromTextBox() {
            // Regions are one per line, and eliminate empty lines
            const text = this.region_text.trim().split(/\r?\n/).filter((value) => !!value);
            return text.map((item) => parseRegion(item, { region_size: this.max_range }));
        },
        validateRegions(items) {
            // There must be at least one region selected. Can add other checks in the future.
            return !!items.length;
        },
        updateRegions(content) { // List of {chr,start, end} entries, one per region
            // This is used by scoped slots: Receive a list of regions, and populate textarea
            // Sometimes we may want to handle fetching items from a network request; wrap in a
            //   promise to be sure this handles async behavior or values, consistently
            this.show_loader = true;
            Promise.resolve(content)
                .then((items) => items.map(({ chr, start, end }) => `${chr}:${start}-${end}`).join('\n'))
                .then((result) => {
                    this.region_text = result;
                })
                .catch((e) => {
                    this.message = 'Unable to retrieve items';
                })
                .finally(() => {
                    this.show_loader = false;
                });
        },
        sendRegions() {
            // Fetch, parse, and send the list of regions
            let items;
            try {
                items = this.getRegionsFromTextBox();
            } catch (e) {
                this.message = e.toString();
                return;
            }
            if (!items.length) {
                this.message = 'Must specify at least one region';
                return;
            }
            this.message = '';
            this.$emit('ready', items);
            this.$refs.dropdown.hide();
        },
    },
};
</script>

<template>
  <div>
    <b-dropdown
      ref="dropdown"
      variant="info"
      right
      text="Batch view">
      <div class="px-3">
        <label for="batch-region-list">Specify regions to plot (one per line):</label>
        <textarea
          id="batch-region-list"
          v-model="region_text"
          rows="10"
          placeholder="chr:start-end or chr:pos"/>
        <div
          v-if="message"
          class="text-danger">{{ message }}</div>
        <div class="d-flex justify-content-end align-items-center">
          <div
            v-if="show_loader"
            class="d-flex align-items-center spinner-border   text-secondary mr-1"
            role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <!-- Optional spot for a button (like "fetch presets") -->
          <slot
            :updateRegions="updateRegions"
            name="preset-button"/>
          <button
            class="btn btn-success ml-1"
            @click="sendRegions">Go</button>
        </div>
      </div>
    </b-dropdown>
  </div>
</template>

<style scoped>

</style>
