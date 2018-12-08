import { REGEX_MARKER } from '@/util/constants';

const PARSER_PRESETS = {
    // Counting starts at 0
    epacts: { marker_col: 3, pvalue_col: 8, is_log_p: false }, // https://genome.sph.umich.edu/wiki/EPACTS#Output_Text_of_All_Test_Statistics
    plink: { marker_col: 1, pvalue_col: 8, is_log_p: false }, // https://www.cog-genomics.org/plink2/formats
    // TODO: Documentation source for rvtests?
    rvtests: { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pvalue_col: 15, is_log_p: false },
    // FIXME: Canadian Sarah suggests that SAIGE columns depend on which options were chosen
    saige: { marker_col: 2, pvalue_col: 11, is_log_p: false }, // https://github.com/weizhouUMICH/SAIGE/wiki/SAIGE-Hands-On-Practical
    // FIXME: What is correct pvalue col- 11 or 12?
    'bolt-lmm': { chr_col: 1, pos_col: 2, ref_col: 5, alt_col: 4, pvalue_col: 10, is_log_p: false }, // https://data.broadinstitute.org/alkesgroup/BOLT-LMM/#x1-450008.1
};


/**
 * Compute the levenshtein distance between two strings. Useful for finding the single best column
 *  name that matches a given rule.
 *  @private
 */
function levenshtein(a, b) { // https://github.com/trekhleb/javascript-algorithms
    // Create empty edit distance matrix for all possible modifications of
    // substrings of a to substrings of b.
    const distanceMatrix = Array(b.length + 1)
        .fill(null)
        .map(() => Array(a.length + 1)
            .fill(null));

    // Fill the first row of the matrix.
    // If this is first row then we're transforming empty string to a.
    // In this case the number of transformations equals to size of a substring.
    for (let i = 0; i <= a.length; i += 1) {
        distanceMatrix[0][i] = i;
    }

    // Fill the first column of the matrix.
    // If this is first column then we're transforming empty string to b.
    // In this case the number of transformations equals to size of b substring.
    for (let j = 0; j <= b.length; j += 1) {
        distanceMatrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            distanceMatrix[j][i] = Math.min(
                distanceMatrix[j][i - 1] + 1, // deletion
                distanceMatrix[j - 1][i] + 1, // insertion
                distanceMatrix[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return distanceMatrix[b.length][a.length];
}

/**
 * Return the index of the first column name that meets acceptance criteria
 * @param {String[]} column_synonyms
 * @param {String[]}header_names
 * @param {Number} threshold Tolerance for fuzzy matching (# edits)
 * @return {Number|null} Index of the best matching column, or null if no match possible
 */
function findColumn(column_synonyms, header_names, threshold = 2) {
    // Find the column name that best matches
    let best_score = threshold + 1;
    let best_match = null;
    for (let i = 0; i < header_names.length; i++) {
        const header = header_names[i];
        if (header === null) {
            // If header is empty, don't consider it for a match
            // Nulling a header provides a way to exclude something from future searching
            continue; // eslint-disable-line no-continue
        }
        const score = Math.min(...column_synonyms.map(s => levenshtein(header, s)));
        if (score < best_score) {
            best_score = score;
            best_match = i;
        }
    }
    return best_match;
}

/**
 *
 * @param {String[]} header_row
 * @param {String[][]} data_rows
 */
function guessGWAS(header_row, data_rows) {
    // 1. Find a specific set of info: marker OR chr/pos/ref/alt ; pvalue OR log_pvalue
    // 2. Validate that we will be able to parse the required info: fields present and make sense
    // 3. Based on the field names selected, attempt to infer meaning: verify whether log is used,
    //  and check ref/alt vs effect/noneffect
    // 4. Return a parser config object if all tests pass, OR null.

    // Normalize case and remove leading comment marks from line for easier comparison
    let headers = header_row.map(item => item.toLowerCase());
    headers[0].replace('/^#+/', '');
    // Lists of fields are drawn from Encore (AssocResultReader) and Pheweb (conf_utils.py)
    const MARKER_FIELDS = ['snpid', 'marker', 'markerid'];
    const CHR_FIELDS = ['chrom', 'chr'];
    const POS_FIELDS = ['position', 'pos', 'begin', 'beg', 'bp', 'end'];

    // TODO: How to handle orienting ref vs effect?
    // Order matters: consider ambiguous field names for ref before alt
    const REF_FIELDS = ['A1'];
    const ALT_FIELDS = ['A2'];

    const LOGPVALUE_FIELDS = ['log_pvalue', 'log_pval'];
    const PVALUE_FIELDS = ['pvalue', 'p.value', 'pval', 'p_score'];

    // 1. Get marker

}

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
function makeParser({ marker_col, chr_col, pos_col, ref_col, alt_col, pvalue_col, is_log_p = false, delimiter = '\t' } = {}) {
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
            alt_allele: alt,
            log_pvalue: log_pval,
            variant: `${chr}:${pos}${ref_alt}`,
        };
    };
}

export {
    // Public configuration options
    makeParser, PARSER_PRESETS,
    // Private members exposed for testing
    levenshtein as _levenshtein,
    findColumn as _findColumn,
};
