import { assert } from 'chai';
import { REGEX_POSITION, REGEX_REGION } from '../../src/util/constants';


describe('REGEX_POSITION', () => {
    it('handles various region formats', () => {
        const scenarios = [
            'chr1:1',
            'chr1 : 1',
            '1:2',
            '1 : 2',
        ];
        scenarios.forEach((item) => assert.match(item, REGEX_POSITION, `Match found for ${item}`));
    });
});

describe('REGEX_REGION', () => {
    it('handles various region formats', () => {
        const scenarios = [
            'chr1:1-2',
            'chr1 : 1-2',
            '1:2-3',
            '1 : 2-3',
        ];
        scenarios.forEach((item) => assert.match(item, REGEX_REGION, `Match found for ${item}`));
    });
});
