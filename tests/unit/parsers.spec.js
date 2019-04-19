import { assert } from 'chai';
import { makeParser } from '@/gwas/parsers';


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
            const saige_sample = 'chr1\t76792\tchr1:76792:A:C\tA\tC\t57\t0.00168639048933983\t16900\t0.573681678183941\t0.663806747906141\t1.30193005902619\t0.387461577915637\t0.387461577915637\t1\t2.2694293866027\t2.41152256615949';
            const parser = makeParser({ marker_col: 2, pval_col: 11, is_log_pval: false });
            const actual = parser(saige_sample);
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
            const rvtests_sample = '1\t761893\tG\tT\t19292\t2.59624e-05:0.000655308:0\t1:1:0\t0.998289:0.996068:0.998381\t1:1:1\t19258:759:18499\t1:1:0\t0:0:0\t1.33113\t0.268484\t18.4664\t7.12493e-07';
            const parser = makeParser({
                chr_col: 0,
                pos_col: 1,
                ref_col: 2,
                alt_col: 3,
                pval_col: 15,
                is_log_pval: false,
            });
            const actual = parser(rvtests_sample);
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
