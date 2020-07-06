<script>
/**
 * Show a "scroll through a list of regions" toolbar
 */
export default {
    name: 'BatchScroller',
    props: {
        regions: { type: Array, default: () => [] },
    },
    data() {
        return { current_index: null };
    },
    computed: {
        current_region() {
            return this.current_index === null ? null : this.regions[this.current_index];
        },
        current_region_display() {
            const region = this.current_region;
            if (!region) {
                return '(none)';
            }
            const { chr, start, end } = region;
            return `${chr}: ${start.toLocaleString()}-${end.toLocaleString()}`;
        },
    },
    methods: {
        cancelNavigation() {
            this.$emit('cancel');
        },
        goToItem(increment) {
            if (this.current_index === null) {
                this.current_index = 0;
            } else {
                this.current_index += increment;
            }
            this.$emit('navigate', this.current_region);
        },
    },
};
</script>


<template>
  <div class="alert-success d-flex justify-content-between align-items-center">
    <button
      :disabled="current_index <= 0"
      class="btn btn-link"
      @click="goToItem(-1)"
    >&lt; Prev</button>
    <span>
      Current Locus: {{ current_region_display }} -
      <span v-if="current_index !==null">
        ({{ current_index + 1 }} of {{ regions.length }}) -
      </span>
      <button
        class="btn btn-link p-0 border-0 align-bottom"
        title="Cancel navigation"
        @click="cancelNavigation"
      >cancel batch mode</button>
    </span>
    <button
      :disabled="current_index !== null && current_index >= regions.length - 1"
      class="btn btn-link"
      @click="goToItem(+1)"
    >Next &gt;</button>
  </div>
</template>

<style scoped></style>
