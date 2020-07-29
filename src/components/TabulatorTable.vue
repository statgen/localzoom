<script>
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

export default {
    name: 'TabulatorTable',
    props: {
        table_data: { type: Array, default: () => [] },
        columns: { type: Array, default: () => [] },
        initialSort: { type: Array, default: () => [] },
        layout: { type: String, default: 'fitData' },
        layoutColumnsOnNewData: { type: Boolean, default: true },
        height: { type: String, default: '100%' },
    },
    watch: {
        table_data: {
            handler(value) {
                this.tabulator.setData(value);
            },
            deep: true,
        },
        columns: { // Redefine the table
            handler(value) {
                this.tabulator.setColumns(value);
                this.tabulator.setSort(value);
            },
            deep: true,
        },
    },
    beforeCreate() {
        // DOM-manipulating widgets should store reference statically, not dynamically
        this.tabulator = null;
    },
    mounted() {
        const {
            table_data: data,
            columns, initialSort, layout, layoutColumnsOnNewData, height,
        } = this;
        this.tabulator = new Tabulator(
            this.$refs.table,
            { data, columns, initialSort, layout, layoutColumnsOnNewData, height },
        );
        // Expose a reference to the raw table object, for advanced usages such as click events
        this.$emit('connected', this.tabulator);
    },
};
</script>

<template>
  <div>
    <div ref="table"><slot/></div>
  </div>
</template>
