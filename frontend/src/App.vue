<template>
  <router-view />
</template>

<script setup>
</script>

<style>
/* Reset and base styles */
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --bg-main: #f8fafc;
  --surface: #ffffff;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-main);
  color: var(--text-main);
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

button {
  cursor: pointer;
  font-family: inherit;
}

input, select {
  font-family: inherit;
}
</style>
