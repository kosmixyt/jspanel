<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <h1>About</h1>
    <p>This is a Vite + Vue 3 + TypeScript + Vue Router starter project.</p>
    <p>
      <RouterLink to="/">Back to Home</RouterLink>
    </p>
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #42b983;
  margin-bottom: 1rem;
}

p {
  line-height: 1.6;
  margin-bottom: 1rem;
}

a {
  color: #42b983;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
