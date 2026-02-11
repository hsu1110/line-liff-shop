<script setup>
import { onMounted } from "vue";
import liffService from "./services/liff";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
  // 1. 先初始化已有的服務
  await liffService.init();
  
  // 2. 確保 Router 已經準備好
  await router.isReady();

  // 3. 解析 URL 參數
  const urlParams = new URLSearchParams(window.location.search);
  const pid = urlParams.get("pid");
  const page = urlParams.get("page");

  // 小功能：如果是從舊連結 (?pid=...) 或選單 (?page=...) 進來的，自動導向
  if (pid) {
    router.replace({ name: "product", params: { id: pid } });
  } else if (page) {
    console.log("Redirecting to page:", page);
    // 如果頁面名稱存在於路由中，就跳轉
    router.replace({ name: page }).catch(err => {
      console.error("Navigation failed:", err);
    });
  }
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
