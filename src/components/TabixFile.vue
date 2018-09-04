<script type="application/javascript">
/* global blobReader */
/**
 * Create a reader instance by picking files from a local machine
 */

export default {
    data() {
        return { validationMessage: '' };
    },
    methods: {
        addSource(event) {
            const self = this;
            self.validationMessage = '';
            const { files } = event.target;

            let tabix_file;
            let gwas_file;
            for (let i = 0; i < files.length; i++) {
                const f = files.item(i);
                if (f.name.endsWith('.tbi')) {
                    tabix_file = f;
                } else {
                    gwas_file = f;
                }
            }
            if (files.length !== 2 || !tabix_file) {
                self.validationMessage = 'Must select two files: gzipped data and accompanying tabix index';
                return;
            }
            const name = tabix_file.name.replace(/\.gz|\.tbi/gi, '');
            blobReader(gwas_file, tabix_file).then((reader) => {
                self.$emit('connected', reader, name);
            }).catch((err) => {
                self.validationMessage = err;
            });
        },
    },
};
</script>

<template>
<div>
  <label>Select a file...
    <input id="file-picker" type="file"
           multiple accept="application/gzip,.tbi" @change="addSource($event)">
  </label>
  <p id="validation-message">{{validationMessage}}</p>
</div>
</template>
