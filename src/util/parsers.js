import { REGEX_MARKER } from '@/util/constants';

const PARSER_PRESETS = {
    // Counting starts at 0
    epacts: { marker_col: 3, pvalue_col: 8, is_log_p: false },
    plink: { marker_col: 1, pvalue_col: 8, is_log_p: false },
    // TODO: Documentation source for rvtests?
    rvtests: { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pvalue_col: 15, is_log_p: false },
    // FIXME: Canadian Sarah suggests that SAIGE columns depend on which options were chosen
    saige: { marker_col: 2, pvalue_col: 11, is_log_p: false },
    // FIXME: What is correct pvalue col- 11 or 12?
    'bolt-lmm': { chr_col: 1, pos_col: 2, ref_col: 5, alt_col: 4, pvalue_col: 10, is_log_p: false },
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
 * Convert all missing values to a standardized input form
 * Useful for columns like pvalue, where a missing value explicitly allowed
 */
function missingToNull(values, nulls = ['', '.', 'NA', 'N/A', 'n/a', 'nan', '-nan', 'NaN', '-NaN', 'null', 'NULL'], placeholder = null) {
    // TODO Make this operate on a single value; cache for efficiency?
    const nullset = new Set(nulls);
    return values.map(v => (nullset.has(v) ? placeholder : v));
}

/**
 * Parse a single marker, cleaning up values as necessary
 * @param {String} value
 * @param {boolean} test If called in testing mode, do not throw an exception
 * @returns {[string, number, string|null, string|null] | null} chr, pos, ref, alt (if match found)
 */
function parseMarker(value, test = false) {
    const match = value.match(REGEX_MARKER);
    if (match) {
        return match.slice(1);
    }
    if (!test) {
        throw new Error('Could not understand marker format. Must be of format chr:pos or chr:pos_ref/alt');
    } else {
        return null;
    }
}

/**
 * Parse (and validate) a single pvalue according to preset rules
 * @param value
 * @param {boolean} is_log_p
 * @returns {number||null} The -log10 pvalue
 */
function parsePval(value, is_log_p = false) {
    if (value === null) {
        return value;
    }
    const val = +value;
    if (is_log_p) { // Take as is
        return val;
    }
    // Regular pvalue: validate and convert
    if (val < 0 || val > 1) {
        throw new Error('p value is not in the allowed range');
    }
    // 0-values are explicitly allowed and will convert to infinity by design
    return -Math.log10(val);
}

function getChromPosRefAlt(header_row, data_rows) {
    // Get from either a marker, or 4 separate columns
    const MARKER_FIELDS = ['snpid', 'marker', 'markerid'];
    const CHR_FIELDS = ['chrom', 'chr'];
    const POS_FIELDS = ['position', 'pos', 'begin', 'beg', 'bp', 'end', 'ps'];

    // TODO: How to handle orienting ref vs effect?
    // Order matters: consider ambiguous field names for ref before alt
    const REF_FIELDS = ['A1', 'ref', 'reference', 'allele0', 'allele1'];
    const ALT_FIELDS = ['A2', 'alt', 'alternate', 'allele1', 'allele2'];

    const first_row = data_rows[0];
    const marker_col = findColumn(MARKER_FIELDS, header_row);
    if (marker_col !== null && parseMarker(first_row[marker_col], true)) {
        return { marker_col };
    }

    // If single columns were incomplete, attempt to auto detect 4 separate columns. All 4 must
    //  be found for this function to report a match.
    const headers_marked = header_row.slice();
    const find = [
        ['chr_col', CHR_FIELDS],
        ['pos_col', POS_FIELDS],
        ['ref_col', REF_FIELDS],
        ['alt_col', ALT_FIELDS],
    ];
    const config = [];
    for (let i = 0; i < find.length; i++) {
        const [col_name, choices] = find[i];
        const col = findColumn(choices, headers_marked);
        if (col === null) {
            return null;
        }
        config[col_name] = col;
        // Once a column has been assigned, remove it from consideration
        headers_marked[col] = null;
    }
    return config;
}

/**
 * Return parser configuration for pvalues
 * @param header_row
 * @param data_rows
 * @returns {{}}
 */
function getPvalColumn(header_row, data_rows) {
    // TODO: Allow overrides
    const LOGPVALUE_FIELDS = ['log_pvalue', 'log_pval', 'logpvalue'];
    const PVALUE_FIELDS = ['pvalue', 'p.value', 'pval', 'p_score'];

    let ps;
    const validateP = (col, data, is_log) => { // Validate pvalues
        const cleaned_vals = missingToNull(data.map(row => row[col]));
        try {
            ps = cleaned_vals.map(p => parsePval(p, is_log));
        } catch (e) {
            return false;
        }
        return ps.every(val => !Number.isNaN(val));
    };

    const log_p_col = findColumn(LOGPVALUE_FIELDS, header_row);
    const p_col = findColumn(PVALUE_FIELDS, header_row);

    if (log_p_col !== null && validateP(log_p_col, data_rows, true)) {
        return { pvalue_col: log_p_col, is_log_p: true };
    } else if (p_col && validateP(p_col, data_rows, false)) {
        return { pvalue_col: p_col, is_log_p: false };
    }
    // Could not auto-determine an appropriate pvalue column
    return null;
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
    const headers = header_row.map(item => (item ? item.toLowerCase() : item));
    headers[0].replace('/^#+/', '');
    // Lists of fields are drawn from Encore (AssocResultReader) and Pheweb (conf_utils.py)
    const pval_config = getPvalColumn(headers, data_rows);
    if (!pval_config) {
        return null;
    }
    headers[pval_config.pvalue_col] = null; // Remove this column from consideration
    const position_config = getChromPosRefAlt(headers, data_rows);

    if (pval_config && position_config) {
        return Object.assign({}, pval_config, position_config);
    }
    return null;
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
    makeParser, guessGWAS,

    // TODO: Deprecate this one
    PARSER_PRESETS,
    // Private members exposed for testing
    levenshtein as _levenshtein,
    findColumn as _findColumn,
    getPvalColumn as _getPvalColumn,
    missingToNull as _missingToNull,
};
