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
    if (typeof value !== 'number') {
        return null;
    }
    return LocusZoom.TransformationFunctions.get('scinotation')(value);
}

export default {
    name: 'ExportData',
    components: { TabulatorTable },
    props: {
        known_tracks: { type: Array, default: () => [] },
        has_credible_sets: { type: Boolean, default: true },
        table_data: { type: Array, default: () => [] },
    },
    data() {
        return {
            selected_study: '',
            export_type: 'top_hits',
        };
    },
    computed: {
        source_name() {
            // FIXME: make source name function consider datatype directly
            return `gwas_${sourceName(this.selected_study || '')}`;
        },

        gwas_tracks() {
            return this.known_tracks.filter(({data_type}) => data_type === 'gwas');
        },

        table_config() {
            // How should the table display this set of fields? Determined once at component load.
            const base = [
                { title: 'Chrom', field: 'assoc:chromosome' },
                { title: 'Pos', field: 'assoc:position', sorter: 'number' },
                { title: 'Ref', field: 'assoc:ref_allele' },
                { title: 'Alt', field: 'assoc:alt_allele' },
                { title: 'rsID', field: 'assoc:rsid' },
                {
                    title: '-log<sub>10</sub>(p)',
                    field: 'assoc:log_pvalue',
                    formatter: formatSciNotation,
                    sorter: 'number',
                },
                {
                    title: '&beta;',
                    field: 'assoc:beta',
                    formatter: 'money',
                    formatterParams: { precision: 3 },
                    sorter: 'number',
                },
                {
                    title: 'SE(&beta;)',
                    field: 'assoc:stderr_beta',
                    formatter: 'money',
                    formatterParams: { precision: 3 },
                    sorter: 'number',
                },
                {
                    title: 'Alt freq.',
                    field: 'assoc:alt_allele_freq',
                    formatter: 'money',
                    formatterParams: { precision: 3 },
                    sorter: 'number',
                },
            ];
            if (this.has_credible_sets) {
                base.push(
                    { title: 'Cred. set', field: 'credset:is_member', formatter: 'tickCross' },
                    { title: 'Posterior probability', field: 'credset:posterior_prob', formatter: formatSciNotation },
                );
            }
            return base;
        },
    },
    watch: {
        source_name() {
            // What data should this widget request from the plot?
            const { source_name } = this;

            if (!this.gwas_tracks.find(({filename: kf}) => kf === this.selected_study)) {
                // Reset logic: notify external widgets to remove any subscribers
                this.$emit('requested-data');
                return;
            }

            // Side effect in computed: sketchy but convenient. Since panels are consistently named, emit the name oif a panel with the desired data
            // Request to follow the data from a layer, which automatically takes into account "get extra data" options like credsets
            // FIXME: incorporate datatype into sourcename caller; make sure listeners map to plot correctly
            this.$emit('requested-data', `association_${source_name}.associationpvalues`);
        },
    },
    beforeCreate() {
        // Reference DOM-manipulating pieces as static properties
        this.table = null;
    },
    methods: {
        exportCSV() {
            this.table.download('csv', `results_${this.source_name}.csv`);
        },
    },
};
</script>

<template>
  <div>
    <div class="row">
      <div class="col-md-12">
        <label>Select a study:
          <select
            v-model="selected_study"
            :disabled="gwas_tracks.length === 0"
            style="width: 20em;">
            <option value="">(none selected)</option>
            <option
              v-for="{filename, display_name} in gwas_tracks"
              :value="filename"
              :key="filename">
              {{ display_name === filename ? display_name : `${display_name} ({${filename})` }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="selected_study">
      <div class="row">
        <div class="col-md-12">
          <button
            :disabled="!selected_study"
            class="btn btn-info float-right"
            @click="exportCSV">Download</button>
        </div>
      </div>

      <div class="row">
        <div class="col-md-12">
          <tabulator-table
            :columns="table_config"
            :initial-sort="[{column: 'assoc:log_pvalue', dir: 'desc'}]"
            :table_data="table_data"
            height="300px"
            @connected="table = $event" />
        </div>
      </div>
    </div>
    <p v-else>Please select a GWAS dataset to use the "export" feature.</p>
  </div>
</template>

<style scoped>

</style>
