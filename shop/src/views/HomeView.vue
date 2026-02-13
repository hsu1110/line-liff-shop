<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../stores/productStore'
import ProductCard from '../components/ProductCard.vue'

const productStore = useProductStore()
const router = useRouter()

onMounted(() => {
  productStore.fetchProducts()
})

function goToProduct(pid) {
  router.push({ name: 'product', params: { id: pid } })
}
</script>

<template>
  <div class="home-container">
    <header class="admin-header glass-card">
      <div class="header-main">
        <div class="header-info">
          <h1 class="logo-text">Nanikore.c</h1>
          <p class="admin-subtitle">日本代購精選商城・精品推薦</p>
        </div>
      </div>

      <!-- Stats Bar (Shop Perspective) -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">全站商品</span>
          <span class="stat-value">{{ productStore.displayProducts.length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">現貨供應</span>
          <span class="stat-value available">{{ productStore.displayProducts.filter(p => p.status === 'AVAILABLE').length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已售完</span>
          <span class="stat-value sold-out">{{ productStore.displayProducts.filter(p => p.status === 'SOLD_OUT').length }}</span>
        </div>
      </div>
    </header>
    
    <div v-if="productStore.loading && productStore.allProducts.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-text">載入中...</p>
      <p class="loading-dots">載入日本直送精品</p>
    </div>

    <div v-else-if="productStore.error" class="error-state glass-card">
      <div class="icon">⚠️</div>
      <p>{{ productStore.error }}</p>
      <button @click="productStore.fetchProducts(true)" class="retry-btn">重新嘗試</button>
    </div>

    <div v-else-if="!productStore.displayProducts || productStore.displayProducts.length === 0" class="empty-state">
      <div class="icon">📦</div>
      <p>目前沒有上架商品，請稍後再來</p>
    </div>

    <div v-else class="product-grid">
      <ProductCard 
        v-for="(p, idx) in productStore.displayProducts" 
        :key="p.pid" 
        :product="p"
        :style="{ animationDelay: `${idx * 0.1}s` }"
        class="animate-card"
        @click="goToProduct(p.pid)"
      />
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
}

/* Unified Header Styles */
.admin-header {
  padding: 24px;
  margin-bottom: 32px;
  border-radius: 20px;
}

.header-main {
  margin-bottom: 24px;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(45deg, var(--primary), #20bf6b);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.admin-subtitle {
  font-size: 0.9rem;
  color: var(--text-sub);
}

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--glass-border);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-sub);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
}

/* Shop specific stat colors */
.stat-value.available { color: var(--primary); }
.stat-value.sold-out { color: #d63031; }
.text-primary { color: var(--primary); }

.stat-divider {
  width: 1px;
  height: 30px;
  background: var(--glass-border);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.2rem;
}

/* ProductCard.vue handles card styles */

.loading-state, .empty-state, .error-state {
  padding: 4rem 2rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--glass-border);
  border-top-color: var(--primary);
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 1rem;
  padding: 10px 24px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-weight: 600;
}
</style>
