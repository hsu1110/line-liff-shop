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
    <header class="home-header">
      <h1>Nanikore.c</h1>
      <p class="subtitle">日本代購精選商城</p>
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

.home-header {
  margin-bottom: 2rem;
  text-align: center;
}

.home-header h1 {
  font-size: 2rem;
  background: linear-gradient(45deg, var(--primary), #20bf6b);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--text-sub);
  font-size: 0.9rem;
  letter-spacing: 2px;
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
