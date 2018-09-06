<template>
  <div>
    <region-picker v-if="selections.length"></region-picker>
    <h3>Your studies</h3>
    <studies-vlist :items="selections"></studies-vlist>

    <button class="btn btn-primary mx-auto-auto"
            @click="showModal = true">Add a dataset</button>

    <adder-wizard v-if="showModal"
                  @config-ready="sendConfig" @close="showModal = false"></adder-wizard>
  </div>
</template>

<script>
import AdderWizard from './components/AdderWizard.vue';
import RegionPicker from './components/RegionPicker.vue';
import StudiesVlist from './components/StudiesVlist.vue';

// eslint-disable-next-line no-unused-vars
export default {
    name: 'gwas-chooser',
    data() {
        return {
            // Whether to show the "add a gwas" UI
            showModal: false,
            // Many GWAS selections can be added. Track a list of chosen GWASs (by filename)
            selections: [],
        };
    },
    methods: {
        sendConfig(name, reader, options) {
            // This particular app captures reader options for display, then relays them to the plot
            this.selections.push(name);
            this.$root.$emit('config-ready', name, reader, options);
        },
    },
    components: {
        AdderWizard,
        StudiesVlist,
        RegionPicker,
    },
};
</script>

<style>
</style>
