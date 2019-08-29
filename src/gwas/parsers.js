import { REGEX_MARKER } from './parser_utils';

/**
 * Specify how to parse a GWAS file, given certain column information.
 * Outputs an object with fields in portal API format.
 * @param [marker_col]
 * @param [chr_col]
 * @param [pos_col]
 * @param [ref_col]
 * @param [alt_col]
 * @param pval_col
 * @param [beta_col]
 * @param [stderr_col]
 * @param [is_log_pval=false]
 * @param [delimiter='\t']
 * @return {function(*): {chromosome: *, position: number, ref_allele: *,
 *          log_pvalue: number, variant: string}}
 */
function makeParser({ marker_col, chr_col, pos_col, ref_col, alt_col, pval_col, beta_col, stderr_col, is_log_pval = false, delimiter = '\t' } = {}) {
    // Column IDs should be 1-indexed (human friendly)
    if (marker_col !== undefined && chr_col !== undefined && pos_col !== undefined) {
        throw new Error('Must specify either marker OR chr + pos');
    }
    if (!(marker_col !== undefined || (chr_col !== undefined && pos_col !== undefined))) {
        throw new Error('Must specify how to locate marker');
    }

    return (line) => {
        const fields = line.split(delimiter);
        let chr;
        let pos;
        let ref;
        let alt;
        if (marker_col !== undefined) {
            const marker = fields[marker_col - 1];
            const match = marker.match(REGEX_MARKER);
            if (!match) {
                // eslint-disable-next-line no-throw-literal
                throw new Error('Could not understand marker format. Must be of format chr:pos or chr:pos_ref/alt');
            }
            [chr, pos, ref, alt] = match.slice(1);
        } else if (chr_col !== undefined && pos_col !== undefined) {
            chr = fields[chr_col - 1].replace(/^chr/g, '');
            pos = fields[pos_col - 1];
            ref = fields[ref_col - 1];
            alt = fields[alt_col - 1];
        } else {
            throw new Error('Must specify how to parse file');
        }

        const pvalue_raw = +fields[pval_col - 1];
        const log_pval = is_log_pval ? pvalue_raw : -Math.log10(pvalue_raw);
        ref = ref || null;
        alt = alt || null;

        const beta = beta_col !== undefined ? +fields[beta_col - 1] : null;
        const stderr_beta = stderr_col !== undefined ? +fields[stderr_col - 1] : null;
        const ref_alt = (ref && alt) ? `_${ref}/${alt}` : '';
        return {
            chromosome: chr,
            position: +pos,
            ref_allele: ref,
            alt_allele: alt,
            log_pvalue: log_pval,
            variant: `${chr}:${pos}${ref_alt}`,
            beta,
            stderr_beta,
        };
    };
}

// Preconfigured parser with defaults for a standard file format
const standard_gwas_parser = makeParser({
    chr_col: 1,
    pos_col: 2,
    ref_col: 3,
    alt_col: 4,
    pval_col: 5,
    beta_col: 6,
    stderr_col: 7,
    is_log_pval: true,
    delimiter: '\t',
});

export { makeParser, standard_gwas_parser };
