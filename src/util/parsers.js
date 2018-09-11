import { REGEX_MARKER } from '@/util/constants';

/**
 * Specify how to parse a GWAS file, given certain column information.
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
            const marker = fields[marker_col];
            const match = marker.match(REGEX_MARKER);
            if (!match) {
                // eslint-disable-next-line no-throw-literal
                throw new Error('Could not understand marker format. Must be of format chr:pos or chr:pos_ref/alt');
            }
            [chr, pos, ref, alt] = match.slice(1);
        } else if (chr_col !== undefined && pos_col !== undefined) {
            chr = fields[chr_col].replace(/^chr/g, '');
            pos = fields[pos_col];
            ref = fields[ref_col];
            alt = fields[alt_col];
        } else {
            throw new Error('Must specify how to parse file');
        }

        const pvalue_raw = +fields[pvalue_col];
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

export default makeParser;
