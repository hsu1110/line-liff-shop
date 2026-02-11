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
    <h1>最新商品</h1>
    
    <div v-if="loading" class="loading">
      載入中...
    </div>

    <div v-else-if="errMsg" class="error">
      {{ errMsg }}
      <br><small>(請確認後端是否已部署最新版本)</small>
    </div>

    <div v-else-if="products.length === 0" class="empty">
      尚無上架商品
    </div>

    <div v-else class="product-grid">
      <div 
        v-for="p in products" 
        :key="p.pid" 
        class="product-card"
        @click="goToProduct(p.pid)"
      >
        <div class="img-wrapper">
          <img :src="p.image_url" :alt="p.name" loading="lazy" />
          <div v-if="p.status === 'SOLD_OUT'" class="sold-out-overlay">SOLD OUT</div>
        </div>
        <div class="p-info">
          <h3>{{ p.name }}</h3>
          <p class="price">$ {{ p.price }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 1rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.product-card:active {
  transform: scale(0.98);
}

.img-wrapper {
  position: relative;
  aspect-ratio: 1/1;
  background: #eee;
}

.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sold-out-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.p-info {
  padding: 0.8rem;
}

.p-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2; /* Standard property */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price {
  color: #ff5555;
  font-weight: bold;
  font-size: 1.1rem;
  margin: 0;
}

.loading, .empty, .error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: red;
}
</style>
