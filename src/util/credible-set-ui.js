/* global LocusZoom */
/**
 Helpers for credible set display functionality
 */

function formatSciNotation(cell, params) {
    // Tabulator cell formatter using sci notation
    const value = cell.getValue();
    return LocusZoom.TransformationFunctions.get('scinotation')(value);
}
function createTableConfig(source_name) {
    return [
        { title: 'Variant', field: `assoc_${source_name}:variant` },
        { title: 'Chrom', field: `assoc_${source_name}:chromosome` },
        { title: 'Pos', field: `assoc_${source_name}:position` },
        { title: 'Ref', field: `assoc_${source_name}:ref_allele` },
        { title: 'Alt', field: `assoc_${source_name}:alt_allele` },
        { title: '-log10 pvalue', field: `assoc_${source_name}:log_pvalue`, formatter: formatSciNotation },
        { title: 'Posterior probability', field: `credset_${source_name}:posterior_prob`, formatter: formatSciNotation },
    ];
}

export default createTableConfig;
export { createTableConfig };
