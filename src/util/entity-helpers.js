/**
 * Helper functions for handling various entities, like identifier strings (genes, regions, etc)
 *  that appear in a wide range of genetic datasets
 */

import { DEFAULT_REGION_SIZE, REGEX_POSITION, REGEX_REGION } from './constants';

/**
 * Parse a single position and return a range, based on the region size
 * @param {Number} position
 * @param {Number} region_size
 * @returns {Number[]} [start, end]
 */
function positionToMidRange(position, { region_size = DEFAULT_REGION_SIZE } = {}) {
    const bounds = Math.floor(region_size / 2);
    return [Math.max(position - bounds, 1), position + bounds];
}

/**
 * Parse a single position and return a range with this position near the start (with some padding)
 * @param position
 * @param DEFAULT_REGION_SIZE
 * @returns {Number[]} [start, end]
 */
function positionToStartRange(position, { region_size = DEFAULT_REGION_SIZE, padding = 0.025 } = {}) {
    const start = Math.max(1, position - region_size * padding);
    const end = start + region_size * (1 + padding);
    return [start, end];
}

/**
 * Parse a variant/region identifier, in the format chr:start-end or chr:center. Return start
 * and end positions.
 *
 * @param {string} spec
 * @param {number} [region_size=DEFAULT_REGION_SIZE] If specified, enforces a max region size.
 * @returns {[string, number, number]} [chr, start, end]
 */
function parseRegion(spec, { region_size = DEFAULT_REGION_SIZE }) {
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
        [start, end] = positionToMidRange(pos, { region_size });
    } else {
        throw new Error(`Could not parse the specified range: ${spec}`);
    }

    if (region_size && (end - start) > region_size) {
        throw new Error(`Maximum allowable range is ${region_size.toLocaleString()} bp`);
    }

    if (end < start) {
        throw new Error(`The requested end position ${end.toLocaleString()} is smaller than the requested start position ${start.toLocaleString()}`);
    }
    return { chr, start, end };
}

export { parseRegion, positionToMidRange, positionToStartRange };
