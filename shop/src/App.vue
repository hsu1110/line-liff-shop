<script setup>
import { onMounted } from "vue";
import liffService from "./services/liff";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
  // 1. 初始化 LIFF
  await liffService.init();
  
  // 2. 等待 Router 就緒
  await router.isReady();
  
  // 這裡不再做任何手動轉址，完全依賴 Vue Router 的標準機制
});
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
