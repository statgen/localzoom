<script type="application/javascript">
/* global urlReader */
/**
* Given a URL, connect and create a reader instance. Also returns config options that can be used
* with the reader instance.
*/
export default {
    data() {
        return { url: '' };
    },
    methods: {
        addSource() {
            const self = this;
            const indexUrl = `${this.url}.tbi`;
            // Name is last part of url path, stripped of file extensions
            const name = indexUrl.split('/').pop().replace(/\.gz|\.tbi/gi, '');
            urlReader(this.url, indexUrl).then((reader) => {
                self.$emit('connected', reader, name);
            }).catch((err) => {
                self.$emit('fail', err);
            });
        },
    },
};
</script>

<template>
  <!--
    TODO: Not every server supports range requests. Validate request before connecting reader.
  -->
<div>
  <input type="url" v-model.trim="url" placeholder="Specify a URL">
  <button class="btn-primary" @click="addSource">Add</button>
</div>
</template>

<style>
</style>
