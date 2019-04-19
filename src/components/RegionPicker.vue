<template>
  <div class="form-inline">
    <vue-bootstrap-typeahead
        :data="search_results"
        v-model="region"
        :serializer="s => s.term"
        :min-matching-chars="3"
        placeholder="chr:start-end"/>
    <button @click="selectRegion" class="btn btn-primary">Go to region</button>
  </div>
</template>

<script>
import { debounce } from 'lodash';
import VueBootstrapTypeahead from 'vue-bootstrap-typeahead/src/components/VueBootstrapTypeahead.vue';

import { REGEX_REGION } from '../util/constants';
import { REGEX_MARKER } from '../gwas/parser_utils';

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
            default: 'https://portaldev.sph.umich.edu/api_internal_dev/v1/annotation/omnisearch/',
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
        positionToRange(pos) {
            const bounds = Math.floor(this.max_range / 2);
            return [pos - bounds, pos + bounds];
        },
        selectRegion() {
            if (!this.region) {
                this.$emit('fail', 'Please specify a region');
                return;
            }
            const range_match = this.region.match(REGEX_REGION);
            const single_match = this.region.match(REGEX_MARKER);

            let chr;
            let start;
            let end;
            const search_result = this.search_results.find(item => this.region === item.term);
            if (search_result) {
                // For genes and rsids, the suggested range is often too narrow.
                //   Pick a region centered on the midpoint of the range.
                ({ chrom: chr, start, end } = search_result);
                [start, end] = this.positionToRange((start + end) / 2);
            } else if (range_match) {
                [chr, start, end] = range_match.slice(1);
                // Ensure that returned values are numeric
                start = +start;
                end = +end;
                if ((end - start) > this.max_range) {
                    this.$emit('fail', `Maximum allowable range is ${this.max_range.toLocaleString()}`);
                    return;
                }
            } else if (single_match) {
                let pos;
                [chr, pos] = single_match.slice(1);
                pos = +pos;
                [start, end] = this.positionToRange(pos);
            } else {
                this.$emit('fail', 'Could not parse specified range');
                return;
            }
            this.$emit('ready', { chr, start, end });
        },
        doSearch() {
            // TODO: Generalize URL + parse for other apis in future
            const url = `${this.search_url}?q=${encodeURIComponent(this.region)}&build=${encodeURIComponent(this.build)}`;
            fetch(url)
                .then(resp => resp.json())
                .then((data) => {
                    // Limit the API response to a set of valid, and useful, search results
                    //   (omnisearch does some things we don't need)
                    this.search_results = data.data.filter(item => !item.error && (item.type !== 'region'));
                });
        },
    },
    // eslint-disable-next-line func-names
    watch: { region: debounce(function () { this.doSearch(); }, 500) },
};
</script>

<style scoped>
</style>
