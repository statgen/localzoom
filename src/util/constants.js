const PORTAL_API_BASE_URL = 'https://portaldev.sph.umich.edu/api/v1/';
const PORTAL_DEV_API_BASE_URL = 'https://portaldev.sph.umich.edu/api_internal_dev/v1/';
const LD_SERVER_BASE_URL = 'https://portaldev.sph.umich.edu/ld/';

const REGEX_MARKER = /^(?:chr)?([a-zA-Z0-9]+?):(\d+)[_:]?(\w+)?[/:|]?([^_]+)?_?(.*)?/;
const REGEX_REGION = /(?:chr)?(.+):(\d+)-(\d+)/;

export {
    REGEX_MARKER, REGEX_REGION,
    PORTAL_API_BASE_URL, PORTAL_DEV_API_BASE_URL, LD_SERVER_BASE_URL,
};
