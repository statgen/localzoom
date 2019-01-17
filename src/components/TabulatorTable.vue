<script>
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';

export default {
    name: 'TabulatorTable',
    props: {
        table_data: Array,
        columns: Array,
        initialSort: Array,
        layout: { default: 'fitData' },
        layoutColumnsOnNewData: { default: true, type: Boolean },
        height: { default: '100%' },
    },
    beforeCreate() {
        // DOM-manipulating widgets should store reference statically, not dynamically
        this.tabulator = null;
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
    <div ref="table"><slot></slot></div>
  </div>
</template>
