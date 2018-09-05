<script type="application/javascript">
/* global urlReader */
/**
* Given a URL, connect and create a reader instance. Also returns config options that can be used
* with the reader instance.
*/
export default {
    data() {
        return {
            url: '',
            validationMessage: '',
        };
    },
    methods: {
        addSource() {
            const self = this;
            self.validationMessage = '';

            const indexUrl = `${this.url}.tbi`;

            // Name is last part of url path, stripped of file extensions
            const name = indexUrl.split('/').pop().replace(/\.gz|\.tbi/gi, '');
            urlReader(this.url, indexUrl).then((reader) => {
                self.$emit('connected', reader, name);
            }).catch((err) => {
                self.validationMessage = err;
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
  <input type="url" v-model.trim="url" size="100" placeholder="Specify a URL">
  <button class="btn-primary" @click="addSource">Add</button>
  <p id="validation-message">{{validationMessage}}</p>
</div>
</template>

<style>
</style>
