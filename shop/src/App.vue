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
  <main class="app-main">
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
  </main>

  <nav class="bottom-nav">
    <router-link to="/" class="nav-item">
      <div class="icon">🏠</div>
      <span>商城</span>
    </router-link>
    <router-link to="/cart" class="nav-item cart-btn">
      <div class="icon">🛒</div>
      <span>購物車</span>
    </router-link>
    <router-link to="/history" class="nav-item">
      <div class="icon">📜</div>
      <span>訂單</span>
    </router-link>
  </nav>
</template>

<style scoped>
.app-main {
  padding-bottom: calc(80px + var(--safe-bottom));
}

.bottom-nav {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  height: 65px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 32px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding-bottom: var(--safe-bottom);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: var(--text-sub);
  font-size: 11px;
  gap: 4px;
  transition: all 0.3s ease;
}

.nav-item .icon {
  font-size: 20px;
}

.nav-item.router-link-active {
  color: var(--primary);
  transform: translateY(-5px);
}

.nav-item.router-link-active .icon {
  filter: drop-shadow(0 0 5px rgba(6, 199, 85, 0.5));
}

/* 轉場動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
