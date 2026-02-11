<script setup>
import { onMounted } from 'vue'
import liffService from './services/liff'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  liffService.init()

  // Legacy Redirect: ?pid=... -> /product/:id
  const urlParams = new URLSearchParams(window.location.search);
  const pid = urlParams.get('pid');
  
  if (pid) {
    // Replace URL to clean query params and push router
    // Use replace to avoid back button loop
    router.replace({ name: 'product', params: { id: pid } })
  }
})
</script>

<template>
  <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/history">History</RouterLink>
        <RouterLink to="/cart">Cart</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  background-color: #f8f9fa;
  padding: 1rem;
}

nav {
  display: flex;
  gap: 1rem;
}

nav a {
  text-decoration: none;
  color: #333;
  font-weight: bold;
}

nav a.router-link-active {
  color: #06c755;
}
</style>
