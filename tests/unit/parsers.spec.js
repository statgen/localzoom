import { assert } from 'chai';
import {
    _findColumn, _getPvalColumn,
    _levenshtein,
    _missingToNull, guessGWAS,
    makeParser,
} from '../../src/util/parsers';


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

    it('chooses the first exact match when more than one is present', () => {
        const headers = ['chr', 'pvalue', 'p.value', 'marker'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, 1);
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

    it('skips headers with a null value', () => {
        const headers = ['chr', null, 'marker', 'pval'];
        const match = _findColumn(pval_names, headers);
        assert.equal(match, 3);
    });
});

describe('missingToNull', () => {
    it('converts a range of missing values to null values', () => {
        // Every other one should get converted
        const values = [0, null, 5, 'n/a', 'bob', '-NaN'];
        const result = _missingToNull(values);
        assert.deepStrictEqual(result, [0, null, 5, null, 'bob', null]);
    });
});

describe('getPvalColumn', () => {
    it('finds logp before p', () => {
        const headers = ['logpvalue', 'pval'];
        const data_rows = [[0.5, 0.5]];

        const actual = _getPvalColumn(headers, data_rows);
        assert.deepEqual(actual, { pval_col: 0, is_log_pval: true });
    });

    it('checks that pvalues are in a realistic range 0..1', () => {
        const headers = ['pval'];
        const data_rows = [[100]];

        const actual = _getPvalColumn(headers, data_rows);
        assert.deepEqual(actual, null);
    });
});

describe('guessGWAS format detection', () => {
    it('Returns null if columns could not be identified', () => {
        const headers = ['rsid', 'pval'];
        const data = [['rs1234', 0.5]];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(actual, null);
    });

    it.skip('handles BOLT-LMM', () => {
        // https://data.broadinstitute.org/alkesgroup/BOLT-LMM/#x1-450008.1
        // TODO: Get real sample of data
    });

    it('handles EPACTS', () => {
        // https://genome.sph.umich.edu/wiki/EPACTS#Output_Text_of_All_Test_Statistics
        const headers = ['#CHROM', 'BEGIN', 'END', 'MARKER_ID', 'NS', 'AC', 'CALLRATE', 'MAF', 'PVALUE', 'SCORE', 'N.CASE', 'N.CTRL', 'AF.CASE', 'AF.CTRL'];
        const data = [['20', '1610894', '1610894', '20:1610894_G/A_Synonymous:SIRPG', '266', '138.64', '1', '0.26061', '6.9939e-05', '3.9765', '145', '121', '0.65177', '0.36476']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(actual, { marker_col: 3, pval_col: 8, is_log_pval: false });
    });

    it('handles METAL', () => {
        const headers = ['#CHROM', 'POS', 'REF', 'ALT', 'N', 'POOLED_ALT_AF', 'DIRECTION_BY_STUDY', 'EFFECT_SIZE', 'EFFECT_SIZE_SD', 'H2', 'PVALUE'];
        const data = [['1', '10177', 'A', 'AC', '491984', '0.00511094', '?-????????????????-????+???????????????????????????????????????????????????????????????????-????????????????????????????????????????????????????????????????????????????????', '-0.0257947', '0.028959', '1.61266e-06', '0.373073']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pval_col: 10, is_log_pval: false },
        );
    });

    it.skip('handles PLINK', () => {
        // https://www.cog-genomics.org/plink2/formats
        // TODO: Get sample of data
    });

    it('handles RAREMETAL', () => {
        const headers = ['#CHROM', 'POS', 'REF', 'ALT', 'N', 'POOLED_ALT_AF', 'DIRECTION_BY_STUDY', 'EFFECT_SIZE', 'EFFECT_SIZE_SD', 'H2', 'PVALUE'];
        const data = [['1', '10177', 'A', 'AC', '491984', '0.00511094', '?-????????????????-????+???????????????????????????????????????????????????????????????????-????????????????????????????????????????????????????????????????????????????????', '-0.0257947', '0.028959', '1.61266e-06', '0.373073']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pval_col: 10, is_log_pval: false },
        );
    });

    it('handles RAREMETALWORKER', () => {
        const headers = ['#CHROM', 'POS', 'REF', 'ALT', 'N_INFORMATIVE', 'FOUNDER_AF', 'ALL_AF', 'INFORMATIVE_ALT_AC', 'CALL_RATE', 'HWE_PVALUE', 'N_REF', 'N_HET', 'N_ALT', 'U_STAT', 'SQRT_V_STAT', 'ALT_EFFSIZE', 'PVALUE'];
        const data = [['9', '400066155', 'T', 'C', '432', '0', '0', '0', '1', '1', '432', '0', '0', 'NA', 'NA', 'NA', 'NA']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pval_col: 16, is_log_pval: false },
        );
    });

    it('handles RVTESTS', () => {
        // Courtesy of xyyin and gzajac
        const headers = ['CHROM', 'POS', 'REF', 'ALT', 'N_INFORMATIVE', 'AF', 'INFORMATIVE_ALT_AC', 'CALL_RATE', 'HWE_PVALUE', 'N_REF', 'N_HET', 'N_ALT', 'U_STAT', 'SQRT_V_STAT', 'ALT_EFFSIZE', 'PVALUE'];
        const data = [['1', '761893', 'G', 'T', '19292', '2.59624e-05:0.000655308:0', '1:1:0', '0.998289:0.996068:0.998381', '1:1:1', '19258:759:18499', '1:1:0', '0:0:0', '1.33113', '0.268484', '18.4664', '7.12493e-07']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pval_col: 15, is_log_pval: false },
        );
    });

    it('handles SAIGE', () => {
        // https://github.com/weizhouUMICH/SAIGE/wiki/SAIGE-Hands-On-Practical
        const headers = ['CHR', 'POS', 'SNPID', 'Allele1', 'Allele2', 'AC_Allele2', 'AF_Allele2', 'N', 'BETA', 'SE', 'Tstat', 'p.value', 'p.value.NA', 'Is.SPA.converge', 'varT', 'varTstar'];
        const data = [['chr1', '76792', 'chr1:76792:A:C', 'A', 'C', '57', '0.00168639048933983', '16900', '0.573681678183941', '0.663806747906141', '1.30193005902619', '0.387461577915637', '0.387461577915637', '1', '2.2694293866027', '2.41152256615949']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { marker_col: 2, pval_col: 11, is_log_pval: false },
        );
    });

    it('handles some unlabeled file formats', () => {
        // TODO: Identify the program used and make test more explicit
        // FIXME: This test underscores difficulty of reliable ref/alt detection- a1 comes
        //  before a0, but it might be more valid to switch the order of these columns
        const headers = ['chr', 'rs', 'ps', 'n_mis', 'n_obs', 'allele1', 'allele0', 'af', 'beta', 'se', 'p_score'];
        const data = [['1', 'rs75333668', '762320', '0', '3610', 'T', 'C', '0.013', '-5.667138e-02', '1.027936e-01', '5.814536e-01']];
        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { chr_col: 0, pos_col: 2, ref_col: 5, alt_col: 6, pval_col: 10, is_log_pval: false },
        );
    });

    it('handles output of AlisaM pipeline', () => {
        const headers = ['MarkerName', 'chr', 'pos', 'ref', 'alt', 'minor.allele', 'maf', 'mac', 'n', 'pvalue', 'SNPID', 'BETA', 'SE', 'ALTFreq', 'SNPMarker'];
        const data = [['chr1-281876-AC-A', 'chr1', '281876', 'AC', 'A', 'alt', '0.231428578495979', '1053', '2275', '0.447865946615285', 'rs72502741', '-0.0872936159370696', '0.115014743551501', '0.231428578495979', 'chr1:281876_AC/A']];

        const actual = guessGWAS(headers, data);
        assert.deepEqual(
            actual,
            { chr_col: 1, pos_col: 2, ref_col: 3, alt_col: 4, pval_col: 9, is_log_pval: false },
        );
    });
});
