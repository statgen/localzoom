<script type="application/javascript">
/**
* Given a URL, connect and create a reader instance. Also returns config options that can be used
* with the reader instance.
 *
 * FIXME: Warning: This is highly experimental, and performs no validation.
 *  Server MUST support byte-range requests- many local servers do not. Use at your own risk.
*/

import { urlReader } from 'tabix-reader';

export default {
    data() {
        return { url: '' };
    },
    methods: {
        addSource() {
            const self = this;
            const indexUrl = `${this.url}.tbi`;
            // Suggested dataset label is last part of url path, stripped of file extensions
            const name = indexUrl.split('/').pop().replace(/\.gz|\.tbi/gi, '');
            urlReader(this.url, indexUrl).then((reader) => {
                self.$emit('ready', reader, name);
            }).catch((err) => {
                self.$emit('fail', err);
            });
        },
    },
};
</script>

<template>
  <div class="form-inline flex-nowrap">
    <input 
      v-model.trim="url" 
      type="url"
      class="form-control mr-1" 
      placeholder="Specify a URL">
    <button 
      class="btn btn-success" 
      @click="addSource">Add</button>
  </div>
</template>

<style>
</style>
