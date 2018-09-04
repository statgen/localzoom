<script>
export default {
    name: 'TabixOptions',
    data() {
        return {
            delimiter_options: [
                ['\t', 'Tab'],
                [' ', 'Space'],
                [',', 'Comma'],
            ],
            marker_col: 4,
            pvalue_col: 5,
            is_log_p: false,
            delimiter: '\t',
        };
    },
    methods: {
        sendOptions() {
            const { marker_col, pvalue_col, is_log_p, delimiter } = this;
            this.$emit('connected', { marker_col, pvalue_col, is_log_p, delimiter });
        },
    },
};
</script>

<template>
  <div>
    <label>Marker column:
      <input v-model="marker_col" type="number"
             min="0" step="1" placeholder="0" class="number-field">
    </label>
    <label>P-value column:
      <input v-model="pvalue_col" type="number"
             min="0" step="1" placeholder="1" class="number-field">
    </label>
    <label>
      <input v-model="is_log_p" type="checkbox">Uses -log(p)
    </label>
    <label>Delimiter:
      <select v-model="delimiter">
        <option v-for="delimiter in delimiter_options" :key="delimiter[0]" :value="delimiter[0]">
          {{delimiter[1]}}
        </option>
      </select>
    </label>
    <button class="button button-primary" @click="sendOptions">Accept options</button>
  </div>
</template>

<style>
  .number-field {
    width: 4em;
  }
</style>
