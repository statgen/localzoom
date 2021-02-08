import { assert } from 'chai';
import { parseRegion } from '../../src/util/entity-helpers';


describe('parseRegion', function () {
    it('parses a single position', function () {
        let result = parseRegion('1:1000', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 900, end: 1100}, 'Single position is center of a defined region size');

        result = parseRegion('chr1:1000', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 900, end: 1100}, 'Allows matching with a leading chr prefix');

        result = parseRegion('1:10', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 1, end: 110}, 'Single position is center of a defined region size, and respects minima');



    });

    it('fails on totally unrecognized formats', function () {
        assert.throws(() => parseRegion('TCF7L2'), 'Invalid format because not a region', /Could not parse/);
        assert.throws(() => parseRegion('1:23ab'), 'Invalid format because trailing chars', /Could not parse/);
    });

    it('handles various region types', function () {
        // Note: this region is actually too small for a real LZ plot, but that is not the job of this function to handle.
        let result = parseRegion('1:1000-2000', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 1000, end: 1000}, 'Faithfully parses a region as given');

        result = parseRegion('chr1:1000-2000', {region_size: 100});
        assert.deepEqual(result, {chr: '1', start: 1000, end: 1000}, 'Allows matching with a leading chr prefix');

        assert.throws(
            () => parseRegion('2:1-1000', {region_size: 250}),
            'Warns if the requested region is too wide',
            /Maximum allowable/
        );
        assert.throws(
            () => parseRegion('2:1000-1', {region_size: 250}),
            'Warns if the requested region makes no sense',
            /smaller than/
        );

        assert.throws(
            () => parseRegion('chr1:1000-2000ab', {region_size: 250}),
            'Fails because trailing characters are present',
            /Could not parse/
        );

    });
});
