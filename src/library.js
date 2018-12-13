/**
 * An alternative build option that makes UI widgets available as a library
 *
 * Note: These widgets use bootstrap for styling.
 */
import AdderWizard from './components/AdderWizard.vue';
import RegionPicker from './components/RegionPicker.vue';
import TabixFile from './components/TabixFile.vue';
import TabixUrl from './components/TabixUrl.vue';
import lzhelpers from './util/lz-helpers';
import gwas_parsers from './util/parsers';

export {
    // Components
    AdderWizard, RegionPicker, TabixFile, TabixUrl,
    // Utility modules with parsing options
    lzhelpers, gwas_parsers,
};
