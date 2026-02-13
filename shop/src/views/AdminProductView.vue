<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { showToast } from '../services/toast'
import { useProductStore } from '../stores/productStore'
import ProductCard from '../components/ProductCard.vue'
import ProductFormModal from '../components/ProductFormModal.vue'

const productStore = useProductStore()

// Modal State
const showModal = ref(false)
const submitting = ref(false)
const editingProduct = ref(null) // null for Add, object for Edit
const loadingPids = reactive(new Set()) // Track loading state for each product

const fetchProducts = async () => {
  // 嘗試使用快取載入，若使用者想強制更新可加按鈕 (目前先用預設策略)
  await productStore.fetchProducts()
}

// Open Modal - Add
const openAddModal = () => {
  editingProduct.value = null
  showModal.value = true
}

// Open Modal - Edit
const openEditModal = (product) => {
  editingProduct.value = product
  showModal.value = true
}

// Save Product (Handled by Modal event)
const saveProduct = async (formData) => {
  submitting.value = true
  const user = liffService.getUser()
  const isEdit = !!formData.pid && formData.pid !== '' // Check if PID exists
  
  try {
    let res
    if (isEdit) {
      res = await api.adminUpdateProduct(user.userId, formData)
    } else {
      res = await api.adminAddProduct(user.userId, formData)
    }

    if (res.data.status === 'success') {
      showToast(isEdit ? '更新成功' : '新增成功', 'success')
      showModal.value = false
      // 強制重新抓取以取得最新資料 (包含後端生成的欄位)
      await productStore.fetchProducts(true)
    } else {
      showToast(res.data.message || '儲存失敗', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('連線錯誤', 'error')
  } finally {
    submitting.value = false
  }
}

const deleteProduct = async (pid) => {
  if (!confirm('確定要刪除此商品嗎？此操作無法復原。')) return
  
  const user = liffService.getUser()
  loadingPids.add(pid)

  try {
    await api.adminDeleteProduct(user.userId, pid)
    // 從 Store 移除
    productStore.removeProductFromStore(pid)
    showToast('商品已刪除', 'success')
  } catch (e) {
    showToast('刪除失敗', 'error')
  } finally {
    loadingPids.delete(pid)
  }
}

onMounted(fetchProducts)
</script>

<template>
  <div class="admin-container">
    <header class="admin-header glass-card">
      <div class="header-main">
        <div class="header-info">
          <h1>商品管理中心</h1>
          <p class="admin-subtitle">管理商城庫存與商品內容</p>
        </div>
        <div class="header-btns">
          <button @click="$router.push('/admin/orders')" class="sub-nav-btn">
            訂單管理中心 →
          </button>
          <button @click="openAddModal" class="add-btn primary-btn">
            <span>+</span> 新增商品
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">總商品數</span>
          <span class="stat-value">{{ productStore.allProducts.length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">現貨</span>
          <span class="stat-value available">{{ productStore.allProducts.filter(p => p.status === 'AVAILABLE').length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已售完</span>
          <span class="stat-value sold-out">{{ productStore.allProducts.filter(p => p.status === 'SOLD_OUT').length }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">暫存</span>
          <span class="stat-value draft">{{ productStore.allProducts.filter(p => p.status === 'TEMP').length }}</span>
        </div>
      </div>
    </header>

    <div v-if="productStore.loading && productStore.allProducts.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>正在從日本伺服器同步資料...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="productStore.allProducts.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <p>目前庫存空空如也</p>
      <button @click="openAddModal" class="add-btn-outline">立即上架首件商品</button>
    </div>

    <div v-else class="product-grid">
      <ProductCard 
        v-for="p in productStore.allProducts" 
        :key="p.pid" 
        :product="p"
        :show-status="false"
      >
        <template #footer>
          <div class="admin-actions-col">
            <span class="status-badge" :class="p.status">
              {{ p.status === 'AVAILABLE' ? '現貨' : (p.status === 'SOLD_OUT' ? '已售完' : '暫存') }}
            </span>
            <div class="admin-btn-group">
              <button @click.stop="openEditModal(p)" class="action-btn edit">編輯</button>
              <button 
                @click.stop="deleteProduct(p.pid)" 
                class="action-btn delete-icon"
                :disabled="loadingPids.has(p.pid)"
              >
                <span v-if="loadingPids.has(p.pid)">⏳</span>
                <span v-else>🗑️</span>
              </button>
            </div>
          </div>
        </template>
      </ProductCard>
    </div>

    <!-- Product Form Modal Component -->
    <ProductFormModal 
      :show="showModal"
      :product="editingProduct"
      :submitting="submitting"
      @close="showModal = false"
      @save="saveProduct"
    />

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

/* Header Redesign */
.admin-header {
  padding: 24px;
  margin-bottom: 32px;
  border-radius: 20px;
}

.header-main {
  display: flex;
  justify-content: space-between;
}

.header-info h1 {
  font-size: 1.5rem; /* Match Order Overview */
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.5px;
  margin-bottom: 4px;
}

.admin-subtitle {
  font-size: 0.9rem;
  color: var(--text-sub);
}

.header-btns {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.primary-btn, .sub-nav-btn {
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(6, 199, 85, 0.2);
  transition: all 0.3s;
}

.primary-btn:hover, .sub-nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(6, 199, 85, 0.3);
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

.stat-value.available { color: var(--primary); }
.stat-value.sold-out { color: #d63031; }
.stat-value.draft { color: #636e72; }

.stat-divider {
  width: 1px;
  height: 30px;
  background: var(--glass-border);
}

/* States */
.loading-state, .empty-state {
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-sub);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.add-btn-outline {
  margin-top: 1.5rem;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  padding: 10px 24px;
  border-radius: 20px;
  font-weight: 600;
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

@media (min-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Slot Actions */
.admin-actions-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.admin-btn-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.status-badge {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  text-align: center;
  font-weight: 600;
  width: fit-content;
}

.status-badge.AVAILABLE { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
.status-badge.SOLD_OUT { background: rgba(255, 118, 117, 0.1); color: #d63031; }
.status-badge.TEMP { background: rgba(200, 200, 200, 0.2); color: #636e72; }

.action-btn {
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  border: none;
  cursor: pointer;
}

.action-btn.edit {
  background: var(--primary); /* Use primary color or a distinct blue */
  color: white;
  flex: 1;
  font-weight: 600;
}

.action-btn.delete-icon {
  background: rgba(255, 118, 117, 0.1);
  color: #d63031;
  width: 40px; /* Square icon button */
  flex: 0 0 40px;
  font-size: 1.2rem;
  padding: 0; /* Center icon */
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}
</style>
