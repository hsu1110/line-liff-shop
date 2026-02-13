<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { showToast } from '../services/toast'
import ProductCard from '../components/ProductCard.vue'
import ProductFormModal from '../components/ProductFormModal.vue'

const products = ref([])
const loading = ref(true)

// Modal State
const showModal = ref(false)
const submitting = ref(false)
const editingProduct = ref(null) // null for Add, object for Edit

const fetchProducts = async () => {
  loading.value = true
  try {
    const res = await api.getProducts()
    products.value = res.data.data
  } finally {
    loading.value = false
  }
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
      await fetchProducts() // Refresh list
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

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="products.length === 0" class="empty-state">
      <p>目前沒有商品，點擊右上角「新增」開始上架。</p>
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
            <button @click.stop="openEditModal(p)" class="action-btn edit">編輯</button>
            <button @click.stop="toggleStatus(p)" class="action-btn status" :class="p.status">
              {{ p.status === 'AVAILABLE' ? '下架' : '上架' }}
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
</style>
