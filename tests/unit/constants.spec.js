import { assert } from 'chai';
import { REGEX_POSITION, REGEX_REGION } from '../../src/util/constants';
import { REGEX_MARKER } from '@/gwas/parser_utils';


describe('REGEX_MARKER', () => {
    it('handles various marker formats', () => {
        const has_chr_pos = ['chr1:23', 'chrX:23', '1:23', 'X:23'];
        const has_chr_pos_refalt = ['chr1:23_A/C', '1:23_A/C', 'chr:1:23:AAAA:G', '1:23_A|C', 'chr1:281876_AC/A'];
        const has_chr_pos_refalt_extra = [
            'chr1:23_A/C_gibberish', '1:23_A/C_gibberish', '1:23_A|C_gibberish',
            '1:51873951_G/GT_1:51873951_G/GT',
        ];

        has_chr_pos.forEach((item) => {
            const match = item.match(REGEX_MARKER);
            assert.ok(match, `Match found for ${item}`);
            assert.lengthOf(match.filter(e => !!e), 3, `Found chr:pos for ${item}`);
        });
        has_chr_pos_refalt.forEach((item) => {
            const match = item.match(REGEX_MARKER);
            assert.ok(match, `Match found for ${item}`);
            assert.lengthOf(match.filter(e => !!e), 5, `Found chr:pos_ref/alt for ${item}`);
        });
        has_chr_pos_refalt_extra.forEach((item) => {
            const match = item.match(REGEX_MARKER);
            assert.ok(match, `Match found for ${item}`);
            assert.lengthOf(match.filter(e => !!e), 6, `Found chr:pos_ref/alt_extra for ${item}`);
        });

        // Pathological edge cases
        let match = '1:51873951_G/GT_1:51873951_G/GT'.match(REGEX_MARKER);
        assert.equal(match[1], '1', 'Found correct chrom');
        assert.equal(match[2], '51873951', 'Found correct pos');
        assert.equal(match[3], 'G', 'Found correct ref');
        assert.equal(match[4], 'GT', 'Found correct alt');

        match = 'sentence_goes_here_1:51873951_G/GT'.match(REGEX_MARKER);
        assert.isNotOk(match, 'Marker must be at start of string');
    });
});

describe('REGEX_POSITION', () => {
    it('handles various region formats', () => {
        const scenarios = [
            'chr1:1',
            'chr1 : 1',
            '1:2',
            '1 : 2',
        ];
        scenarios.forEach(item => assert.match(item, REGEX_POSITION, `Match found for ${item}`));
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
        scenarios.forEach(item => assert.match(item, REGEX_REGION, `Match found for ${item}`));
    });
});
