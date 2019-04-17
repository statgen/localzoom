/**
 * Sniffers: auto detect file format and parsing options for GWAS files.
 *  TODO: Reorganize code base and move more logic here
 */

import { MISSING_VALUES } from './constants';

function isNumeric(val) {
    // Check whether an unparsed string is a numeric value"
    if (MISSING_VALUES.has(val)) {
        return true;
    }
    return !Number.isNaN(+val);
}

function isHeader(row, { comment_char = '#', delimiter = '\t' } = {}) {
    // This assumes two basic rules: the line is not a comment, and gwas data is more likely
    // to be numeric than headers
    return row.startsWith(comment_char) || row.split(delimiter).every(item => !isNumeric(item));
}

export { isNumeric, isHeader };
