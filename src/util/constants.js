const PORTAL_API_BASE_URL = 'https://portaldev.sph.umich.edu/api/v1/';
const LD_SERVER_BASE_URL = 'https://portaldev.sph.umich.edu/ld/';

const REGEX_POSITION = /^(?:chr)?(\w+)\s*:\s*(\d+)$/;
const REGEX_REGION = /^(?:chr)?(\w+)\s*:\s*(\d+)-(\d+)$/;

const DEFAULT_REGION_SIZE = 500000;

// Enum that controls recognized data types, so we can rename/ adjust as needed.
const DATA_TYPES = Object.freeze({
    BED: 'bed',
    GWAS: 'gwas',
    PLINK_LD: 'plink_ld',
});

export {
    DATA_TYPES,
    DEFAULT_REGION_SIZE,
    REGEX_REGION, REGEX_POSITION,
    PORTAL_API_BASE_URL, LD_SERVER_BASE_URL,
};
