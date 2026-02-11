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
    // 如果是 'home'，強制跳轉到 '/'
    const targetRoute = (page === 'home') ? '/' : { name: page };
    
    router.replace(targetRoute).then(() => {
      // 跳轉成功後，清除網址列的參數
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }).catch(err => {
      console.error("Navigation failed:", err);
    });
  } else {
    // 沒有參數時，如果是 Hash Mode，不需要特別做什麼，Router 會自己處理
    // 但如果有殘留的參數 (例如重整後)，也可以考慮清掉
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
