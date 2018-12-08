import { assert } from 'chai';
import { _findColumn, _levenshtein, makeParser, PARSER_PRESETS } from '../../src/util/parsers';


const SAIGE_SAMPLE = 'chr1\t76792\tchr1:76792:A:C\tA\tC\t57\t0.00168639048933983\t16900\t0.573681678183941\t0.663806747906141\t1.30193005902619\t0.387461577915637\t0.387461577915637\t1\t2.2694293866027\t2.41152256615949';
const RVTESTS_SAMPLE = '1\t761893\tG\tT\t19292\t2.59624e-05:0.000655308:0\t1:1:0\t0.998289:0.996068:0.998381\t1:1:1\t19258:759:18499\t1:1:0\t0:0:0\t1.33113\t0.268484\t18.4664\t7.12493e-07';

describe('GWAS parsing', () => {
    describe('Mode selection', () => {
        it.skip('Warns if no marker could be identified', () => {});
    });

    describe('Handles sample data correctly', () => {
        it.skip('parses EPACTS data', () => {
            // FIXME: Alan notes edge cases that may not be handled yet:
            //  -when *PVALUE = 0*, it always indicates a variant is very significant (such that it
            // underflows R's precision limit), and *should be plotted*
            // -when *PVALUE = NA*, it indicates that no test was run for that variant because there
            // were too few copies of the alt allele in the sample, and running the test is a waste
            // of time since it will never be significant. *These can be safely skipped.*"
        });
        it('parses SAIGE data', () => {
            const parser = makeParser(PARSER_PRESETS.saige);
            const actual = parser(SAIGE_SAMPLE);
            assert.deepEqual(actual, {
                alt_allele: 'C',
                chromosome: '1',
                log_pvalue: 0.41177135722616476,
                position: 76792,
                ref_allele: 'A',
                variant: '1:76792_A/C',
            });
        });
        it('parses RVTESTS data', () => {
            const parser = makeParser(PARSER_PRESETS.rvtests);
            const actual = parser(RVTESTS_SAMPLE);
            assert.deepEqual(actual, {
                alt_allele: 'T',
                chromosome: '1',
                log_pvalue: 6.147219398093217,
                position: 761893,
                ref_allele: 'G',
                variant: '1:761893_G/T',
            });
        });
    });
});

describe('Levenshtein distance metric', () => {
    it('Computes levenshtein distance for sample strings', () => {
        const scenarios = [
            ['bob', 'bob', 0],
            ['bob', 'bib', 1],
            ['alice', 'bob', 5],
            ['pvalue', 'p.value', 1],
            ['p.value', 'pvalue', 1],
            ['pvalue', 'log_pvalue', 4],
        ];
        scenarios.forEach((s) => {
            const [a, b, score] = s;
            const val = _levenshtein(a, b);
            assert.equal(score, val, `Incorrect match score for ${a}, ${b}`);
        });
    });
});


describe('_findColumn can fuzzy match column names', () => {
    const pval_names = ['pvalue', 'p.value', 'pval', 'p_score'];

    it('finds the first header that exactly matches a synonym', () => {
        const headers = ['chr', 'pos', 'p.value', 'marker'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, 2);
    });

    it('prefers exact matches over fuzzy matches', () => {
        const headers = ['chr1', 'pos1', 'pvalues', 'p.value', '1marker'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, 3);
    });

    it('finds the first header that closely matches a synonym', () => {
        const headers = ['chr', 'pos', 'marker', 'p-value'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, 3);
    });

    it('returns null if no good match can be found', () => {
        const headers = ['chr', 'pos', 'marker', 'pval_score'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, null);
    });

    it('will match based on a configurable threshold', () => {
        const headers = ['chr', 'marker', 'pval_score'];
        const match = _findColumn(pval_names, headers, 3);
        assert.equal(match, 2);
    });

    it('returns null if no match', () => {
        const headers = ['chr', 'marker', 'position'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, null);
    });

    it('skips headers with a null value', () => {
        const headers = ['chr', null, 'marker', 'pval'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, 3);
    });
});


describe.skip('guessGWAS format detection', () => {
    it('handles EPACTS', () => {
        //
    });
    it('handles METAL', () => {
        const headers = ['#CHROM', 'POS', 'REF', 'ALT', 'N', 'POOLED_ALT_AF', 'DIRECTION_BY_STUDY', 'EFFECT_SIZE', 'EFFECT_SIZE_SD', 'H2', 'PVALUE'];
        const data = ['1', '10177', 'A', 'AC', '491984', '0.00511094', '?-????????????????-????+???????????????????????????????????????????????????????????????????-????????????????????????????????????????????????????????????????????????????????', '-0.0257947', '0.028959', '1.61266e-06', '0.373073'];
    });
    it.skip('handles PLINK', () => {
        // TODO: Get real sample of data
    });
    it('handles RAREMETAL', () => {
        //
    });
    it('handles RAREMETALWORKER', () => {
        //
    });
    it('handles RVTESTS', () => {
        // Courtesy of xyyin and gzajac
        const headers = [
            'CHROM', 'POS', 'REF', 'ALT', 'N_INFORMATIVE', 'AF', 'INFORMATIVE_ALT_AC',
            'CALL_RATE', 'HWE_PVALUE', 'N_REF', 'N_HET', 'N_ALT', 'U_STAT', 'SQRT_V_STAT',
            'ALT_EFFSIZE', 'PVALUE',
        ];

        const data = [
            '1', '761893', 'G', 'T', '19292', '2.59624e-05:0.000655308:0', '1:1:0',
            '0.998289:0.996068:0.998381', '1:1:1', '19258:759:18499', '1:1:0', '0:0:0', '1.33113',
            '0.268484', '18.4664', '7.12493e-07',
        ];
        // TODO: Implement
    });
    it('handles SAIGE', () => {
        //
    });
});
