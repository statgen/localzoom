<script>
/**
 * Show a "scroll through a list of regions" toolbar
 */
export default {
    name: 'BatchScroller',
    props: ['regions'],
    data() {
        return { current_index: null };
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
};
</script>


<template>
<div class="alert-success d-flex justify-content-between align-items-center">
  <button class="btn btn-link"
          @click="goToItem(-1)"
          :disabled="this.current_index <= 0"
  >&lt; Prev</button>
  <span>
    Current Locus: {{current_region_display}} -
    <span v-if="this.current_index !==null">
      ({{this.current_index + 1}} of {{this.regions.length}}) -
    </span>
    <button @click="cancelNavigation"
            class="btn btn-link p-0 border-0 align-bottom"
            title="Cancel navigation"
    >cancel batch mode</button>
  </span>
  <button class="btn btn-link"
          @click="goToItem(+1)"
          :disabled="this.current_index !== null && this.current_index >= this.regions.length - 1"
  >Next &gt;</button>
</div>
</template>

<style scoped></style>
