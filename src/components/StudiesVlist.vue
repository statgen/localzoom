<template>
  <div>
    <div v-if="items.length">
      <ul class="list-group">
        <li v-for="(name, index) in items" :key="index" class="list-group-item">
          {{name}}
        </li>
      </ul>
    </div>
    <div v-else>
      No studies selected
    </div>
  </div>
</template>

<script>
export default {
    name: 'studies-vlist',
    props: {
        items: {
            type: Array,
            default: () => [],
        },
    },
};
</script>

<style scoped>
  li {
    word-break: break-all;
  }
</style>
