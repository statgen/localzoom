<script>
import LocusZoom from 'locuszoom';
import LzPlot from './LzPlot.vue';

export default {
    name: 'PhewasMaker',
    beforeCreate() {
        // LZ plots must be stored as static references, not observables
        this.plot = null;
        this.datasources = null;
    },
    props: ['variant_name', 'build', 'your_study', 'your_logpvalue', 'allow_render'],
    data() {
        // Track whether phewas tab was rendered at least once. Don't draw this plot if no one looks
        // METHOD: 1. if allow_render true, then make initial plot
        // Updates are based on a synthetic property

        // allow_render || rendered (for lz-plot to show)
        return { rendered: this.allow_render };
    },
    computed: {
        display_logpvalue() {
            return LocusZoom.TransformationFunctions.get('scinotation')(this.your_logpvalue);
        },
        base_phewas_layout() {
            const layer = LocusZoom.Layouts.get('data_layer', 'phewas_pvalues', {
                unnamespaced: true,
                y_axis: { min_extent: [0, 10] },
            });
            const panel = LocusZoom.Layouts.get('panel', 'phewas', {
                unnamespaced: true,
                data_layers: [layer],
            });

            return LocusZoom.Layouts.get(
                'plot', 'standard_phewas',
                {
                    height: 250,
                    min_height: 200,
                    panels: [panel],
                    responsive_resize: false,
                    state: { variant: this.variant_name, genome_build: this.build },
                },
            );
        },
        base_phewas_sources() {
            return [
                ['phewas', ['PheWASLZ', { url: 'https://portaldev.sph.umich.edu/ukbb/v1/statistic/phewas/' }]],
            ];
        },
        render_trigger() {
            // HACK: A synthetic property that can be used to drive re-rendering.
            // Useful in tabbed UIs, as a trigger for when the phewas window receives focus.
            return this.allow_render ? this.variant_name : this.variant_name;
        },
    },
    methods: {
        receivePlot(plot, datasources) {
            this.plot = plot;
            this.datasources = datasources;

            // Use listeners to warn when no variant data is available
            plot.subscribeToData(['phewas:id'], (data) => {
                if (!data || !data.length) {
                    plot.curtain.show('There is no PheWAS data available for the requested variant. Please try another variant.');
                }
            });
            // Since the plot already has data, ensure the event fires immediately.
            plot.emit('data_rendered');
        },
    },
    watch: {
        allow_render(value) {
            const { variant_name: variant } = this;
            if (value && variant) {
                // The very first time the user views this component, allow a plot to be created;
                //   this will trigger something in the template that initiates rendering
                this.rendered = true;
            }
            if (this.plot && variant) {
                // Update an existing PheWAS plot when the user opens this tab
                this.plot.curtain.hide();
                this.plot.applyState({ variant });
            }
        },
    },
    components: { LzPlot },
};
</script>

<template>
<div>
  <p v-if="!variant_name || !rendered">
    Please select a variant in order to generate a PheWAS plot. You can click on any scatter plot
    point in an association track.
  </p>
  <div v-else>
    <h3>{{ variant_name }} in context</h3>
    <p>
      In your study <em style="word-break: break-word">{{ your_study }}</em>, this variant has a
      -log<sub>10</sub> p-value of: <strong>{{ display_logpvalue }}</strong>. Below are other
      results for comparison.
    </p>

    <lz-plot
        :base_layout="base_phewas_layout"
        :base_sources="base_phewas_sources"
        :show_loading="true"

        @connected="receivePlot" />
  </div>
  <p>
    PheWAS results are drawn from a large-scale analysis of the UK Biobank dataset, as described in
    <a href="https://doi.org/10.1038/s41588-018-0184-y">Nature Genetics volume 50, pages 1335–1341 (2018)</a>.
  </p>

</div>
</template>


<style scoped>

</style>
