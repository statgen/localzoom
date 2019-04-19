/**
 * Constant values used by GWAS parser
 */

const MISSING_VALUES = new Set(['', '.', 'NA', 'N/A', 'n/a', 'nan', '-nan', 'NaN', '-NaN', 'null', 'NULL', 'None', null]);
const REGEX_MARKER = /^(?:chr)?([a-zA-Z0-9]+?):(\d+)[_:]?(\w+)?[/:|]?([^_]+)?_?(.*)?/;

/**
 * Convert all missing values to a standardized input form
 * Useful for columns like pvalue, where a missing value explicitly allowed
 */
function missingToNull(values, nulls = MISSING_VALUES, placeholder = null) {
    // TODO Make this operate on a single value; cache for efficiency?
    return values.map(v => (nulls.has(v) ? placeholder : v));
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
 * Parse (and validate) a given number, and return the -log10 pvalue.
 * @param value
 * @param {boolean} is_log_pval
 * @returns {number||null} The -log10 pvalue
 */
function parsePvalToLog(value, is_log_pval = false) {
    if (value === null) {
        return value;
    }
    const val = +value;
    if (is_log_pval) { // Take as is
        return val;
    }
    // Regular pvalue: validate and convert
    if (val < 0 || val > 1) {
        throw new Error('p value is not in the allowed range');
    }
    // 0-values are explicitly allowed and will convert to infinity by design
    return -Math.log10(val);
}

export {
    MISSING_VALUES, REGEX_MARKER,
    missingToNull as _missingToNull,
    // Exports for unit testing
    parseMarker as _parseMarker,
    parsePvalToLog as _parsePvalToLog,
};
