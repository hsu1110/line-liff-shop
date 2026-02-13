<script setup>
import { ref, onMounted } from 'vue'
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

// ... (Modal logic omitted)

const toggleStatus = async (product) => {
  if (loadingPids.has(product.pid)) return
  
  // Logic: AVAILABLE -> SOLD_OUT -> AVAILABLE
  // If TEMP -> AVAILABLE (Publish)
  let newStatus = 'AVAILABLE'
  if (product.status === 'AVAILABLE') newStatus = 'SOLD_OUT'
  else if (product.status === 'SOLD_OUT') newStatus = 'AVAILABLE'
  else if (product.status === 'TEMP') newStatus = 'AVAILABLE'

  const user = liffService.getUser()
  loadingPids.add(product.pid)
  
  try {
    await api.adminUpdateProduct(user.userId, { ...product, status: newStatus })
    // 更新 Store 中的狀態
    productStore.updateProductInStore({ ...product, status: newStatus })
    showToast(`狀態已更新為 ${newStatus}`, 'success')
  } catch (e) {
    showToast('更新失敗', 'error')
  } finally {
    loadingPids.delete(product.pid)
  }
}

const deleteProduct = async (pid) => {
  if (!confirm('確定要刪除此商品嗎？此操作無法復原。')) return
  const user = liffService.getUser()
  try {
    await api.adminDeleteProduct(user.userId, pid)
    // 從 Store 移除
    productStore.removeProductFromStore(pid)
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
      <div class="header-top">
        <h1>商品管理中心</h1>
        <!-- Add Button -->
        <button @click="openAddModal" class="add-btn">
          <span>+</span> 新增商品
        </button>
      </div>
      <div class="header-actions">
        <button @click="$router.push('/admin/orders')" class="sub-nav-btn">訂單管理 →</button>
      </div>
    </header>

    <div v-if="productStore.loading && productStore.allProducts.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="productStore.allProducts.length === 0" class="empty-state">
      <p>目前沒有商品，點擊右上角「新增」開始上架。</p>
    </div>

    <div v-else class="product-grid">
      <ProductCard 
        v-for="p in productStore.allProducts" 
        :key="p.pid" 
        :product="p"
        :show-status="false"
      >
        <template #footer>
          <div class="admin-actions">
            <button @click.stop="openEditModal(p)" class="action-btn edit">編輯</button>
            <button 
              @click.stop="toggleStatus(p)" 
              class="action-btn status" 
              :class="[p.status, { 'loading': loadingPids.has(p.pid) }]"
              :disabled="loadingPids.has(p.pid)"
            >
              <span v-if="loadingPids.has(p.pid)">⏳</span>
              <span v-else>
                {{ p.status === 'AVAILABLE' ? '下架' : (p.status === 'TEMP' ? '發佈' : '上架') }}
              </span>
            </button>
            <button @click.stop="deleteProduct(p.pid)" class="action-btn delete">刪除</button>
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

.admin-header {
  margin-bottom: 24px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

h1 {
  font-size: 1.5rem;
  color: var(--text-main);
  margin: 0;
}

.add-btn {
  background: var(--primary);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.sub-nav-btn {
  color: var(--primary);
  font-weight: 600;
  font-size: 0.9rem;
}

.loading-state, .empty-state {
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-sub);
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
.admin-actions {
  display: flex;
  gap: 6px;
  width: 100%;
}

.action-btn {
  flex: 1;
  padding: 6px 0;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.action-btn.edit { background: #34495e; }
.action-btn.status { background: var(--primary); }
.action-btn.status.SOLD_OUT { background: #95a5a6; } 
.action-btn.delete { background: #e74c3c; flex: 0 0 30px; } 

@keyframes rotate {
  to { transform: rotate(360deg); }
}

/* 狀態按鈕樣式 */
.action-btn.status.AVAILABLE { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
.action-btn.status.SOLD_OUT { background: rgba(255, 118, 117, 0.1); color: #d63031; }
.action-btn.status.TEMP { background: rgba(200, 200, 200, 0.2); color: #636e72; }
.action-btn.status.loading { opacity: 0.7; cursor: wait; }
</style>
