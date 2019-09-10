import { parseAlleleFrequency, parseMarker, parsePvalToLog } from './parser_utils';

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
 * @param [allele_freq_col]
 * @param [allele_count_col]
 * @param [n_samples_col]
 * @param [is_alt_effect=true]
 * @param [is_log_pval=false]
 * @param [delimiter='\t']
 * @return {function(*): {chromosome: *, position: number, ref_allele: *,
 *          log_pvalue: number, variant: string}}
 */
function makeParser(
    {
        // Required fields
        marker_col, // position
        chr_col,
        pos_col,
        ref_col,
        alt_col,
        pval_col, // pvalue
        // Optional fields
        beta_col,
        stderr_col,
        allele_freq_col, // Frequency: given directly, OR in terms of counts
        allele_count_col,
        n_samples_col,
        is_alt_effect = true, // whether effect allele is oriented towards alt
        is_log_pval = false,
        delimiter = '\t',
    } = {},
) {
    // Column IDs should be 1-indexed (human friendly)
    if (marker_col !== undefined && chr_col !== undefined && pos_col !== undefined) {
        throw new Error('Must specify either marker OR chr + pos');
    }
    if (!(marker_col !== undefined || (chr_col !== undefined && pos_col !== undefined))) {
        throw new Error('Must specify how to locate marker');
    }

    if (allele_count_col !== undefined && allele_freq_col !== undefined) {
        throw new Error('Allele count and frequency options are mutually exclusive');
    }
    if (allele_count_col !== undefined && n_samples_col === undefined) {
        throw new Error('To calculate allele frequency from counts, you must also provide n_samples');
    }


    return (line) => {
        const fields = line.split(delimiter);
        let chr;
        let pos;
        let ref;
        let alt;

        let freq;
        let alt_allele_freq = null;
        let allele_count;
        let n_samples;

        if (marker_col !== undefined) {
            [chr, pos, ref, alt] = parseMarker(fields[marker_col - 1], false);
        } else if (chr_col !== undefined && pos_col !== undefined) {
            chr = fields[chr_col - 1].replace(/^chr/g, '');
            pos = fields[pos_col - 1];
            ref = fields[ref_col - 1];
            alt = fields[alt_col - 1];
        } else {
            throw new Error('Must specify how to parse file');
        }

        const log_pval = parsePvalToLog(fields[pval_col - 1], is_log_pval);
        ref = ref || null;
        alt = alt || null;

        if (allele_freq_col !== undefined) {
            freq = fields[allele_freq_col - 1];
        }
        if (allele_count_col !== undefined) {
            allele_count = fields[allele_count_col - 1];
            n_samples = fields[n_samples_col - 1];
        }
        const beta = beta_col !== undefined ? +fields[beta_col - 1] : null;
        const stderr_beta = stderr_col !== undefined ? +fields[stderr_col - 1] : null;

        if (allele_freq_col || allele_count_col) {
            alt_allele_freq = parseAlleleFrequency({
                freq,
                allele_count,
                n_samples,
                is_alt_effect,
            });
        }
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
            alt_allele_freq,
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
