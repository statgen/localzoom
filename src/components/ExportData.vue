<script>
/**
 * A LocalZoom-specific export widget. This wraps creation of a fields array + table config based
 * on the currently selected dataset. It emits a fields list event
 */

import LocusZoom from 'locuszoom';

import { sourceName } from '../util/lz-helpers';
import TabulatorTable from './TabulatorTable.vue';

function formatSciNotation(cell, params) {
    // Tabulator cell formatter using sci notation
    const value = cell.getValue();
    return LocusZoom.TransformationFunctions.get('scinotation')(value);
}

export default {
    name: 'ExportData',
    props: ['study_names', 'has_credible_sets', 'table_data'],
    beforeCreate() {
        // Reference DOM-manipulating pieces as static properties
        this.table = null;
    },
    data() {
        return {
            selected_study: '',
            export_type: 'top_hits',
        };
    },
    computed: {
        source_name() {
            return sourceName(this.selected_study || '');
        },
        table_config() {
            // How should the table display this set of fields? Determined once at component load.
            const base = [
                { title: 'Variant', field: 'variant' },
                { title: 'Chrom', field: 'chromosome' },
                { title: 'Pos', field: 'position' },
                { title: 'Ref', field: 'ref_allele' },
                { title: 'Alt', field: 'alt_allele' },
                { title: '-log10 pvalue', field: 'log_pvalue', formatter: formatSciNotation },
            ];
            if (this.has_credible_sets) {
                base.push(
                    { title: 'In credible set?', field: 'is_member', formatter: 'tickCross' },
                    { title: 'Posterior probability', field: 'posterior_prob', formatter: formatSciNotation },
                );
            }
            return base;
        },
    },
    watch: {
        source_name() {
            // What data should this widget request from the plot?
            const { source_name } = this;
            if (!this.study_names.includes(this.selected_study)) {
                // Reset logic: notify external widgets to remove any subscribers
                this.$emit('requested-data', []);
                return;
            }
            const fields = [
                `assoc_${source_name}:variant`, `assoc_${source_name}:chromosome`,
                `assoc_${source_name}:position`, `assoc_${source_name}:ref_allele`,
                `assoc_${source_name}:alt_allele`, `assoc_${source_name}:log_pvalue`,
            ];

            if (this.has_credible_sets) {
                fields.push(
                    `credset_${source_name}:is_member`,
                    `credset_${source_name}:posterior_prob`,
                );
            }
            // Side effect in computed: sketchy but convenient.
            this.$emit('requested-data', fields);
        },
    },
    methods: {
        exportCSV() {
            this.table.download('csv', `results_${this.source_name}.csv`);
        },
    },
    components: { TabulatorTable },
};
</script>

<template>
<div>
  <div class="row">
    <div class="col-md-12">
      <label>Select a study:
        <select style="width: 20em;"
            v-model="selected_study" :disabled="study_names.length === 0">
          <option value="">(none selected)</option>
          <option v-for="(item, index) in study_names" :value="item" :key="index">{{item}}</option>
        </select>
      </label>
    </div>
  </div>

  <div v-if="selected_study">
    <div class="row">
      <div class="col-md-12">
        <button class="btn btn-info float-right"
                :disabled="!selected_study" @click="exportCSV">Download</button>
      </div>
    </div>

    <div class="row">
      <div class="col-md-12">
        <tabulator-table
            :columns="table_config" :initial-sort="[{column: 'log_pvalue', dir: 'desc'}]"
            height="300px" :table_data="table_data"
            @connected="table = $event" />
      </div>
    </div>
  </div>
  <p v-else>Please select a study to use the "export" feature.</p>
</div>
</template>

<style scoped>

</style>
