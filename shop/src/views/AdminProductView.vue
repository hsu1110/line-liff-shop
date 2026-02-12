<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { optimizeImage } from '../services/image'
import { showToast } from '../services/toast'

const products = ref([])
const loading = ref(true)
const userId = liffService.getUser()?.userId

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await api.getProducts()
    products.value = res.data.data
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (product) => {
  const newStatus = product.status === 'AVAILABLE' ? 'SOLD_OUT' : 'AVAILABLE'
  const idToken = await liffService.getIDToken()
  try {
    await api.adminUpdateProduct(idToken, { ...product, status: newStatus })
    product.status = newStatus
    showToast(`狀態已更新為 ${newStatus}`, 'success')
  } catch (e) {
    showToast('更新失敗', 'error')
  }
}

const deleteProduct = async (pid) => {
  if (!confirm('確定要刪除此商品嗎？此操作無法復原。')) return
  const idToken = await liffService.getIDToken()
  try {
    await api.adminDeleteProduct(idToken, pid)
    products.value = products.value.filter(p => p.pid !== pid)
    showToast('商品已刪除', 'success')
  } catch (e) {
    showToast('刪除失敗', 'error')
  }
}

onMounted(fetchProducts)
</script>

<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>商品管理中心</h1>
      <div class="header-actions">
        <button @click="$router.push('/admin/orders')" class="sub-nav-btn">訂單管理 →</button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="product-list">
      <div v-for="p in products" :key="p.pid" class="admin-card glass-card">
        <div class="card-main">
          <img :src="optimizeImage(p.image_url, 200)" class="thumb" />
          <div class="info">
            <h3>{{ p.name }}</h3>
            <p class="price">$ {{ p.price }}</p>
            <div class="status-tag" :class="p.status">
              {{ p.status === 'AVAILABLE' ? '上架中' : '已售完' }}
            </div>
          </div>
        </div>
        
        <div class="card-actions">
          <button @click="toggleStatus(p)" class="action-btn status">
            {{ p.status === 'AVAILABLE' ? '設為售完' : '設為上架' }}
          </button>
          <button @click="deleteProduct(p.pid)" class="action-btn delete">刪除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container {
  padding: 20px;
  padding-bottom: 120px;
}

.admin-header {
  margin-bottom: 24px;
}

h1 {
  font-size: 1.5rem;
  margin-bottom: 12px;
  color: var(--text-main);
}

.sub-nav-btn {
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.admin-card {
  margin-bottom: 16px;
  padding: 16px;
}

.card-main {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.thumb {
  width: 70px;
  height: 70px;
  object-fit: cover;
  border-radius: 8px;
}

.info {
  flex: 1;
}

.info h3 {
  font-size: 1rem;
  margin-bottom: 4px;
}

.price {
  color: var(--accent);
  font-weight: bold;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
  margin-top: 4px;
}

.status-tag.AVAILABLE { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
.status-tag.SOLD_OUT { background: rgba(0, 0, 0, 0.05); color: var(--text-sub); }

.card-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.action-btn.status { background: rgba(0,0,0,0.05); color: var(--text-main); }
.action-btn.delete { background: rgba(255, 118, 117, 0.1); color: #ff7675; }

.loading-state {
  display: flex;
  justify-content: center;
  padding: 50px;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0,0,0,0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}

@keyframes rotate { to { transform: rotate(360deg); } }
</style>
