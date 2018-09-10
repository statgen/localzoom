/* global LocusZoom */
import { REGEX_MARKER } from './constants';


/**
 * Specify how to parse a GWAS file, given certain column information.
 *  (input column numbers are 1-indexed)
 * Outputs an object with fields in portal API format.
 * @param [marker_col]
 * @param [chr_col]
 * @param [pos_col]
 * @param [ref_col]
 * @param [alt_col]
 * @param pvalue_col
 * @param [is_log_p=false]
 * @param [delimiter='\t']
 * @return {function(*): {chromosome: *, position: number, ref_allele: *,
 *          log_pvalue: number, variant: string}}
 */
function makeParser({ marker_col, chr_col, pos_col, ref_col, alt_col, pvalue_col, is_log_p = true, delimiter = '\t' } = {}) {
    // Column IDs should be 0-indexed (computer friendly)
    if (marker_col && chr_col && pos_col) {
        throw new Error('Must specify either marker OR chr + pos');
    }
    if (!(marker_col || (chr_col && pos_col))) {
        throw new Error('Must specify how to locate marker');
    }

    return (line) => {
        const fields = line.split(delimiter);
        let chr;
        let pos;
        let ref;
        let alt;
        if (marker_col) {
            const marker = fields[marker_col - 1];
            const match = marker.match(REGEX_MARKER);

            if (!match) {
                // eslint-disable-next-line no-throw-literal
                throw new Error('Could not understand marker format. Must be of format chr:pos or chr:pos_ref/alt');
            }
            [chr, pos, ref, alt] = match.slice(1);
        } else if (chr_col && pos_col) {
            chr = fields[chr_col - 1];
            pos = fields[pos_col - 1];
            ref = fields[ref_col - 1];
            alt = fields[alt_col - 1];
        } else {
            throw new Error('Must specify how to parse file');
        }

        const pvalue_raw = +fields[pvalue_col - 1];
        const log_pval = is_log_p ? pvalue_raw : -Math.log10(pvalue_raw);
        ref = ref || null;
        alt = alt || null;
        const ref_alt = (ref && alt) ? `_${ref}/${alt}` : '';
        return {
            chromosome: chr,
            position: +pos,
            ref_allele: ref,
            log_pvalue: log_pval,
            variant: `${chr}:${pos}${ref_alt}`,
        };
    };
}


LocusZoom.KnownDataSources.extend('AssociationLZ', 'TabixAssociationLZ', {
    parseInit(init) {
        this.params = init.params; // delimiter, marker_col, pval_col, is_log_p
        this.parser = makeParser(this.params);
        this.reader = init.tabix_reader;
    },
    getCacheKey(state, chain, fields) {
        return [state.chr, state.start, state.end].join('_');
    },
    fetchRequest(state, chain, fields) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.reader.fetch(state.chr, state.start, state.end, (data, err) => {
                if (err) {
                    reject(err);
                }
                resolve(data);
            });
        });
    },
    normalizeResponse(data) {
        return data.map(this.parser);
    },
});

function createPlot(selector, name, reader, params = {}) {
    params.id_field = 'variant';

    const apiBase = 'https://portaldev.sph.umich.edu/api/v1/';
    const data_sources = new LocusZoom.DataSources()
        .add('assoc', ['TabixAssociationLZ', {
            tabix_reader: reader,
            params,
        }])
        .add('ld', ['LDLZ', { url: `${apiBase}pair/LD/` }])
        .add('gene', ['GeneLZ', {
            url: `${apiBase}annotation/genes/`,
            params: { source: 2 },
        }])
        .add('recomb', ['RecombLZ', {
            url: `${apiBase}annotation/recomb/results/`,
            params: { source: 15 },
        }])
        .add('constraint', ['GeneConstraintLZ', { url: 'http://exac.broadinstitute.org/api/constraint' }]);

    // Second, specify what kind of information to display. This demo uses a pre-defined set of
    // panels with common display options.
    const layout = LocusZoom.Layouts.get('plot', 'standard_association', {
        state: {
            chr: '10',
            start: 123802119,
            end: 124202119,
        },
    });
    layout.panels[0].title = { text: name };

    // Last, draw the plot in the div for this page
    const plot = LocusZoom.populate(selector, data_sources, layout);
    return [plot, data_sources];
}

function addPlotPanel(plot, data_sources, name, reader, options = {}) {
    options.id_field = 'variant';
    // TODO: cleanup globals usage
    // Add a GWAS to the plot
    const namespace = `assoc_${name}`;
    data_sources.add(namespace, ['TabixAssociationLZ', {
        tabix_reader: reader,
        params: options,
    }]);
    const mods = {
        namespace: {
            default: namespace,
            assoc: namespace,
            ld: 'ld',
        },
        id: namespace,
        title: { text: name },
        y_index: -1,
    };
    const layout = LocusZoom.Layouts.get('panel', 'association', mods);
    plot.addPanel(layout);
}

export { createPlot, addPlotPanel, makeParser };
