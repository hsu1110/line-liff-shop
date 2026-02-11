<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import { useRouter } from 'vue-router'

const products = ref([])
const loading = ref(true)
const errMsg = ref('')
const router = useRouter()

onMounted(async () => {
  try {
    const res = await api.getProducts()
    if (res.data.status === 'success') {
      products.value = res.data.data
    } else {
      console.error(res.data.message)
      errMsg.value = res.data.message || "無法取得商品列表，請稍後再試"
    }
  } catch (e) {
    console.error(e)
    errMsg.value = "網路連線錯誤，請檢查網路狀態"
  } finally {
    loading.value = false
  }
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
    
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p class="loading-dots">載入日本直送精品</p>
    </div>

    <div v-else-if="errMsg" class="error-state glass-card">
      <div class="icon">⚠️</div>
      <p>{{ errMsg }}</p>
      <button @click="window.location.reload()" class="retry-btn">重新嘗試</button>
    </div>

    <div v-else-if="products.length === 0" class="empty-state">
      <div class="icon">📦</div>
      <p>目前沒有上架商品，請稍後再來</p>
    </div>

    <div v-else class="product-grid">
      <div 
        v-for="(p, idx) in products" 
        :key="p.pid" 
        class="product-card glass-card"
        :style="{ animationDelay: `${idx * 0.1}s` }"
        @click="goToProduct(p.pid)"
      >
        <div class="img-wrapper">
          <img :src="p.image_url" :alt="p.name" loading="lazy" />
          <div v-if="p.status === 'SOLD_OUT'" class="sold-out-overlay">
            <span>SOLD OUT</span>
          </div>
          <div class="price-tag">$ {{ p.price }}</div>
        </div>
        <div class="p-info">
          <h3>{{ p.name }}</h3>
          <div class="card-footer">
            <span class="status-tag" :class="p.status">{{ p.status === 'ON_SALE' ? '現貨' : '已售完' }}</span>
            <div class="go-btn">→</div>
          </div>
        </div>
      </div>
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

.product-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.6s ease out both;
  cursor: pointer;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.img-wrapper {
  position: relative;
  aspect-ratio: 1/1;
  background: #f0f0f0;
}

.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .img-wrapper img {
  transform: scale(1.1);
}

.price-tag {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
  font-weight: 600;
  font-size: 0.9rem;
}

.p-info {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.p-info h3 {
  font-size: 0.95rem;
  margin-bottom: 12px;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
}

.status-tag.ON_SALE { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
.status-tag.SOLD_OUT { background: rgba(0,0,0,0.05); color: var(--text-sub); }

.go-btn {
  width: 24px;
  height: 24px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.sold-out-overlay span {
  padding: 8px 16px;
  border: 2px solid var(--text-main);
  font-weight: 900;
  transform: rotate(-15deg);
}

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
