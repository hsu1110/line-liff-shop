<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { showToast } from '../services/toast'
import ProductCard from '../components/ProductCard.vue'

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
  const user = liffService.getUser()
  try {
    await api.adminUpdateProduct(user.userId, { ...product, status: newStatus })
    product.status = newStatus
    showToast(`狀態已更新為 ${newStatus}`, 'success')
  } catch (e) {
    showToast('更新失敗', 'error')
  }
}

const deleteProduct = async (pid) => {
  if (!confirm('確定要刪除此商品嗎？此操作無法復原。')) return
  const user = liffService.getUser()
  try {
    await api.adminDeleteProduct(user.userId, pid)
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
      <p>載入中...</p>
    </div>

    <div v-else class="product-grid">
      <ProductCard 
        v-for="p in products" 
        :key="p.pid" 
        :product="p"
        :show-status="false"
      >
        <template #footer>
          <div class="admin-actions">
            <button @click.stop="toggleStatus(p)" class="action-btn status" :class="p.status">
              {{ p.status === 'AVAILABLE' ? '設為售完' : '設為上架' }}
            </button>
            <button @click.stop="deleteProduct(p.pid)" class="action-btn delete">刪除</button>
          </div>
        </template>
      </ProductCard>
    </div>
  </div>
</template>

<style scoped>
/* Main Container */
.admin-container {
  padding: 1.5rem;
  padding-bottom: 120px;
  max-width: 600px;
  margin: 0 auto;
}

.home-header { /* Note: This class name might be wrong if template uses admin-header */
  /* Checking template... uses admin-header */
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

.loading-state {
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

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

/* 4-col layout will unlikely trigger if max-width is 600px, but keeping it just in case */
@media (min-width: 768px) {
  .product-grid {
    /* grid-template-columns: repeat(4, 1fr);  Disabled to match Home View 2-col */
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Slot 注入的按鈕樣式 */
.admin-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.action-btn {
  flex: 1;
  padding: 6px 0;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
}

.action-btn.status {
  background: var(--primary);
  color: white;
}

.action-btn.delete {
  background: #dfe6e9; /* 淺灰 */
  color: #636e72;       /* 深灰文字 */
  flex: 0 0 40px;       /* 固定寬度 */
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}
</style>
