<template>
  <div class="form-inline">
    <input type="text" v-model="region" placeholder="chr:start-end" class="form-control">
    <button @click="selectRegion" class="btn btn-primary">Go to region</button>
    <span>{{validationMessage}}</span>
  </div>
</template>

<script>
import { REGEX_MARKER, REGEX_REGION } from '../util/constants';

export default {
    name: 'region-picker',
    props: {
        max_range: {
            type: Number,
            default: 500000,
        },
    },
    data() {
        return {
            region: null,
            validationMessage: '',
        };
    },
    methods: {
        positionToRange(pos) {
            const bounds = Math.floor(this.max_range / 2);
            return [pos - bounds, pos + bounds];
        },
        selectRegion() {
            this.validationMessage = '';
            const range_match = this.region.match(REGEX_REGION);
            const single_match = this.region.match(REGEX_MARKER);

            let chr;
            let start;
            let end;
            if (range_match) {
                [chr, start, end] = range_match.slice(1);
            } else if (single_match) {
                let pos;
                [chr, pos] = single_match.slice(1);
                pos = +pos;
                [start, end] = this.positionToRange(pos);
            } else {
                this.validationMessage = 'Could not parse specified range';
                return;
            }

            // Ensure that returned values are numeric
            start = +start;
            end = +end;
            this.$root.$emit('select-range', { chr, start, end });
        },
    },
};
</script>

<style scoped>

</style>
