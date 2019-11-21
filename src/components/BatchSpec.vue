<script>
/**
 * Allows user to designate a list of regions to plot. Handles parsing and selection of regions,
 *  which will then be consumed by another widget that handles cycling between those choices.
 */

import { BDropdown } from 'bootstrap-vue/esm/';
import { parseRegion } from '../util/entity-helpers';

export default {
    name: 'BatchSpec',
    props: { max_range: Number },
    data() {
        return {
            region_text: '',
            message: null, // display validation errors
        };
    },
    methods: {
        getRegionsFromTextBox() {
            const text = this.region_text.trim().split(/\r?\n/);
            try {
                return text.map(
                    item => parseRegion(item, { region_size: this.max_range }),
                );
            } catch (e) {
                this.message = e.toString();
                return [];
            }
        },
        validateRegions(items) {
            // There must be at least one region selected. Can add other checks in the future.
            return !!items.length;
        },
        updateRegions(content) { // List of [chr,start, end] entries, one per region
            // Receive a list of regions, and store them in the textbox
            // Sometimes we may want to handle fetching items from a network request; wrap in a
            //   promise to be sure this handles async behavior or values, consistently
            Promise.resolve(content)
                .then(items => items.map(({ chr, start, end }) => `${chr}:${start}-${end}`).join('\n'))
                .then((result) => { this.region_text = result; })
                .catch((e) => { this.message = 'Unable to retrieve items'; });
        },
        sendRegions() {
            // Fetch, parse, and send the list of regions
            const items = this.getRegionsFromTextBox();
            if (!this.validateRegions(items)) {
                // FIXME: This removes a more helpful error message superimposed if parsing fails
                this.message = 'Invalid regions specified';
            } else {
                this.message = '';
                this.$emit('ready', items);
                this.$refs.dropdown.hide();
            }
        },
    },
    components: { BDropdown },
};
</script>

<template>
  <div>
    <b-dropdown ref="dropdown" text="Batch view" variant="info">
      <div class="px-3">
        <label for="batch-region-list">Specify regions to plot (one per line):</label>
        <textarea id="batch-region-list" v-model="region_text"
                  rows="10" placeholder="chr:start-end or chr:pos"></textarea>
        <!-- Optional spot for a button (like "fetch presets") -->
        <div class="float-right">
        <slot name="preset-button" :updateRegions="updateRegions"></slot>
        <button @click="sendRegions"  class="btn btn-success ml-1">Go</button>
        <span v-if="message" class="text-danger"><br>{{message}}</span>
          </div>
      </div>
    </b-dropdown>
  </div>
</template>

<style scoped>

</style>
