import { assert } from 'chai';
import { parseRegion } from '../../src/util/entity-helpers';


describe('parseRegion', function () {
    it('parses a single position', function () {
        let result = parseRegion('1:1000', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 950, end: 1050}, 'Single position is center of a defined region size');

        result = parseRegion('chr1:1000', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 950, end: 1050}, 'Allows matching with a leading chr prefix');

        result = parseRegion('1:10', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 1, end: 60}, 'Single position is inside a defined region size, and respects minima');
    });

    it('fails on totally unrecognized formats', function () {
        assert.throws(() => parseRegion('TCF7L2'), /Could not parse/);
        assert.throws(() => parseRegion('1:23ab'), /Could not parse/);
    });

    it('handles various region types', function () {
        // Note: this region is actually too small for a real LZ plot, but that is not the job of this function to handle.
        let result = parseRegion('1:1000-2000', {region_size: 1000});
        assert.deepEqual(result, {chr: '1', start: 1000, end: 2000}, 'Faithfully parses a region as given');

        result = parseRegion('chr1:1000-2000', {region_size: 1000});
        assert.deepEqual(result, {chr: '1', start: 1000, end: 2000}, 'Allows matching with a leading chr prefix');

        result = parseRegion('chr1:1,000-2,000', {region_size: 1000});
        assert.deepEqual(result, {chr: '1', start: 1000, end: 2000}, 'Allows matching regions with commas');

        assert.throws(
            () => parseRegion('2:1-1000', {region_size: 250}),
            /Maximum allowable/,
            'Warns if the requested region is too wide',
        );
        assert.throws(
            () => parseRegion('2:1000-1', {region_size: 250}),
            /smaller than/,
            'Warns if the requested region makes no sense',
        );
        assert.throws(
            () => parseRegion('chr1:1000-2000ab', {region_size: 250}),
            /Could not parse/,
            'Fails because trailing characters are present',
        );
    });
});
