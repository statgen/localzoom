/**
 * Helper functions for handling various entities, like identifier strings (genes, regions, etc)
 */

import { REGEX_POSITION, REGEX_REGION } from './constants';


/**
 * Parse a single position and return a range, based on the region size
 * @param {Number} position
 * @param {Number} region_size
 * @returns {Number[]} [start, end]
 */
function positionToRange(position, { region_size = 500000 }) {
    const bounds = Math.floor(region_size / 2);
    return [position - bounds, position + bounds];
}

/**
 * Parse a variant/region identifier, in the format chr:start-end or chr:center. Return start
 * and end positions.
 *
 * @param {string} spec
 * @param {number} [region_size=500000] Only used when inflating a single position to a range
 * @returns {[string, number, number]} [chr, start, end]
 */
function parseRegion(spec, { region_size = 500000 }) {
    const range_match = spec.match(REGEX_REGION);
    const single_match = spec.match(REGEX_POSITION);
    let chr;
    let start;
    let end;
    if (range_match) {
        [chr, start, end] = range_match.slice(1);
        // Ensure that returned values are numeric
        start = +start;
        end = +end;
    } else if (single_match) {
        let pos;
        [chr, pos] = single_match.slice(1);
        pos = +pos;
        [start, end] = positionToRange(pos, { region_size });
    } else {
        throw new Error(`Could not parse the specified range: ${spec}`);
    }
    return [chr, start, end];
}

export { parseRegion, positionToRange };
