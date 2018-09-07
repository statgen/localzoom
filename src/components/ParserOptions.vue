<script>
export default {
    name: 'ParserOptions',
    data() {
        return {
            delimiter_options: [
                ['\t', 'Tab'],
                [' ', 'Space'],
                [',', 'Comma'],
                ['\u{1F984}', 'UDFF (\u{1F984})'],
            ],
            marker_col: 4,
            pvalue_col: 5,
            is_log_p: false,
            // TODO: For tabix files, delimiter is ALWAYS a tab. For other files, all bets are off.
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
    <button class="btn btn-primary" @click="sendOptions">Accept options</button>
  </div>
</template>

<style scoped>
  .number-field {
    width: 4em;
  }
</style>
