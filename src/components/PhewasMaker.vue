<script>
import LocusZoom from 'locuszoom';
import LzPlot from './LzPlot.vue';

export default {
    name: 'PhewasMaker',
    components: { LzPlot },
    props: {
        variant_name: { type: String, default: '' },
        build: { type: String, default: 'GRCh37' },
        your_study: { type: String, default: '' },
        your_logpvalue: { type: Number, default: null },
        allow_render: { type: Boolean, default: true },
    },
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
        display_pvalue() {
            const log = this.your_logpvalue;
            if (!Number.isFinite(log)) {
                return 0;
            }
            return LocusZoom.TransformationFunctions.get('scinotation')(10 ** -log);
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
    watch: {
        allow_render(value) {
            const { variant_name: variant } = this;
            if (value && variant) {
                // The very first time the user views this component, allow a plot to be created;
                //   this will trigger something in the template that initiates rendering
                this.rendered = true;
            }
            if (this.has_plot && variant) {
                // Update an existing PheWAS plot when the user opens this tab
                this.$refs.phewas_plot.getPlotAttr('curtain').hide();
                this.$refs.phewas_plot.callPlot('applyState', { variant });
            }
        },
    },
    beforeCreate() {
        // LZ plots must be stored as static references, not observables
        this.has_plot = false;
    },
    methods: {
        receivePlot() {
            this.has_plot = true;

            // Use listeners to warn when no variant data is available
            this.$refs.phewas_plot.callPlot('subscribeToData', ['phewas:id'], (data, plot) => {
                if (!data || !data.length) {
                    plot.curtain.show('There is no PheWAS data available for the requested variant. Please try another variant.');
                }
            });
            // Since the plot already has data, ensure the event fires immediately.
            this.$refs.phewas_plot.callPlot('emit', 'data_rendered');
        },
    },
};
</script>

<template>
  <div>
    <p v-if="!variant_name || !rendered">
      Please select a variant in order to generate a PheWAS plot. You can click on any scatter plot
      point in an association track.
    </p>
    <div v-else>
      <h3>Known PheWAS Results: {{ variant_name }}</h3>
      <p>
        In your study <em style="word-break: break-word">{{ your_study }}</em>, this variant has a
        <span
          :title="`p-value ${display_pvalue}`"
          class="text-muted definition">
          -log<sub>10</sub> p-value of <strong>{{ display_logpvalue }}</strong>
        </span>. Below are other
        results for comparison.
      </p>

      <lz-plot
        ref="phewas_plot"
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
.definition {
  text-decoration: dotted underline;
}
</style>
