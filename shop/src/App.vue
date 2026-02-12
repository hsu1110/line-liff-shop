<script setup>
import { onMounted, ref, watch } from "vue";
import liffService from "./services/liff";
import { useRouter } from "vue-router";
import TheToast from "./components/TheToast.vue";
import { toastRef } from "./services/toast";
import { useCartStore } from "./stores/cart";
import api from "./services/api";

const router = useRouter();
const cartStore = useCartStore();
const isBumped = ref(false);
const isAdmin = ref(false);
const isInitializing = ref(true);

onMounted(async () => {
  try {
    await liffService.init();
    
    // 驗證管理員身份
    const user = liffService.getUser();
    
    if (user?.userId) {
      try {
        const res = await api.checkAdmin(user.userId);
        isAdmin.value = res.data.isAdmin;
      } catch (e) {
        console.error("Admin check failed", e);
      }
    }
    
    await router.isReady();
  } finally {
    // 無論成功失敗，最後都要結束讀取狀態，讓 User 能看到畫面 (或錯誤頁)
    isInitializing.value = false;
  }
});

// 監聽購物車總數變化，觸發跳動動畫
watch(() => cartStore.totalItems, (newVal, oldVal) => {
  if (newVal > oldVal) {
    isBumped.value = true;
    setTimeout(() => {
      isBumped.value = false;
    }, 300);
  }
});
</script>

<template>
  <!-- 全局初始化 Loading -->
  <div v-if="isInitializing" class="init-loading">
    <div class="spinner"></div>
    <p>載入中...</p>
  </div>

  <div v-else class="app-content">
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <TheToast ref="toastRef" />

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <div class="icon">🏠</div>
        <span>商城</span>
      </router-link>
      <router-link to="/cart" class="nav-item cart-btn" :class="{ 'bump': isBumped }">
        <div class="icon-wrapper">
          <div class="icon">🛒</div>
          <div v-if="cartStore.totalItems > 0" class="badge">
            {{ cartStore.totalItems }}
          </div>
        </div>
        <span>購物車</span>
      </router-link>
      <router-link to="/history" class="nav-item">
        <div class="icon">📜</div>
        <span>訂單</span>
      </router-link>
      <router-link v-if="isAdmin" to="/admin/products" class="nav-item admin-btn">
        <div class="icon">⚙️</div>
        <span>管理</span>
      </router-link>
    </nav>
  </div>
</template>

<style scoped>
.init-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.init-loading .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.init-loading p {
  color: var(--text-sub);
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

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
  position: relative;
}

.icon-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon {
  font-size: 20px;
}

.badge {
  position: absolute;
  top: -8px;
  right: -10px;
  background: var(--accent);
  color: white;
  font-size: 10px;
  font-weight: 800;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.nav-item.router-link-active {
  color: var(--primary);
  transform: translateY(-5px);
}

.nav-item.router-link-active .icon {
  filter: drop-shadow(0 0 5px rgba(6, 199, 85, 0.5));
}

/* Bump 動畫 */
.bump {
  animation: bump 0.3s ease-out;
}

@keyframes bump {
  0% { transform: scale(1) translateY(-5px); }
  10% { transform: scale(0.9) translateY(-5px); }
  30% { transform: scale(1.1) translateY(-10px); }
  50% { transform: scale(1.15) translateY(-12px); }
  100% { transform: scale(1) translateY(-5px); }
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
