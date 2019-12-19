<template>
  <div class="form-inline">
    <vue-bootstrap-typeahead
        :data="search_results"
        v-model="region"
        :serializer="s => s.term"
        :min-matching-chars="3"
        placeholder="chr:start-end, rs, or gene"/>
    <button @click="selectRegion" class="btn btn-primary">Go to region</button>
  </div>
</template>

<script>
import { debounce } from 'lodash';
import VueBootstrapTypeahead from 'vue-bootstrap-typeahead/src/components/VueBootstrapTypeahead.vue';

import { parseRegion, positionToRange } from '../util/entity-helpers';

export default {
    name: 'region-picker',
    components: { VueBootstrapTypeahead },
    props: {
        max_range: {
            type: Number,
            default: 500000,
        },
        search_url: {
            type: String,
            default: 'https://portaldev.sph.umich.edu/api/v1/annotation/omnisearch/',
        },
        build: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            region: null,
            search_results: [],
        };
    },
    methods: {
        selectRegion() {
            const { max_range } = this;
            if (!this.region) {
                this.$emit('fail', 'Please specify a region');
                return;
            }

            let chr;
            let start;
            let end;
            const search_result = this.search_results.find(item => this.region === item.term);
            if (search_result) {
                // For genes and rsids, the suggested range is often too narrow.
                //   Pick a region centered on the midpoint of the range.
                ({ chrom: chr, start, end } = search_result);
                [start, end] = positionToRange((start + end) / 2, { region_size: max_range });
            } else {
                try {
                    ({ chr, start, end } = parseRegion(this.region, { region_size: max_range }));
                } catch (e) {
                    this.$emit('fail', 'Could not parse specified range');
                    return;
                }
                if ((end - start) > this.max_range) {
                    this.$emit('fail', `Maximum allowable range is ${max_range.toLocaleString()}`);
                    return;
                }
            }
            this.$emit('ready', { chr, start, end });
        },
        doSearch() {
            this.search_results = [];
            const url = `${this.search_url}?q=${encodeURIComponent(this.region)}&build=${encodeURIComponent(this.build)}`;
            fetch(url)
                .then((resp) => {
                    if (resp.ok) {
                        return resp.json();
                    }
                    throw new Error('Server error');
                })
                .then((data) => {
                    // Limit the API response to a set of valid, and useful, search results
                    //   (omnisearch does some things we don't need)
                    this.search_results = data.data.filter(item => !item.error && (item.type !== 'region'));
                })
                .catch(() => this.$emit('fail', 'Could not perform the specified search'));
        },
    },
    // eslint-disable-next-line func-names
    watch: { region: debounce(function () { this.doSearch(); }, 500) },
};
</script>

<style scoped>
</style>
