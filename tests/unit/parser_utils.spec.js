import { assert } from 'chai';
import { _missingToNull } from '@/gwas/parser_utils';


describe('missingToNull', () => {
    it('converts a range of missing values to null values', () => {
        // Every other one should get converted
        const values = [0, null, 5, 'n/a', 'bob', '-NaN'];
        const result = _missingToNull(values);
        assert.deepStrictEqual(result, [0, null, 5, null, 'bob', null]);
    });
});
