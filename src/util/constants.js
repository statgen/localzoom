const PORTAL_API_BASE_URL = 'https://portaldev.sph.umich.edu/api/v1/';
const LD_SERVER_BASE_URL = 'https://portaldev.sph.umich.edu/ld/';

const REGEX_POSITION = /(?:chr)?(\w+)\s*:\s*(\d+)/;
const REGEX_REGION = /(?:chr)?(\w+)\s*:\s*(\d+)-(\d+)/;


export {
    REGEX_REGION, REGEX_POSITION,
    PORTAL_API_BASE_URL, LD_SERVER_BASE_URL,
};
