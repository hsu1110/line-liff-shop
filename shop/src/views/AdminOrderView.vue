<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { showToast } from '../services/toast'
import ProductRow from '../components/ProductRow.vue'

const orders = ref([])
const loading = ref(true)
const userId = liffService.getUser()?.userId

const fetchOrders = async () => {
  loading.value = true
  const user = liffService.getUser()
  try {
    const res = await api.adminGetAllOrders(user.userId)
    orders.value = res.data.data
  } catch (e) {
    console.error("Fetch admin orders error:", e)
    showToast('無法取得訂單列表', 'error')
  } finally {
    loading.value = false
  }
}

// 將訂單按 batchId 分組
const groupedOrders = computed(() => {
  const groups = {}
  if (!orders.value || !Array.isArray(orders.value)) return groups
  
  orders.value.forEach(o => {
    if (!groups[o.orderId]) groups[o.orderId] = []
    groups[o.orderId].push(o)
  })
  return groups
})

const updateStatus = async (orderId, newStatus) => {
  const user = liffService.getUser()
  try {
    await api.adminUpdateOrder(user.userId, orderId, newStatus)
    // 更新本地狀態
    orders.value.forEach(o => {
      if (o.orderId === orderId) o.status = newStatus
    })
    showToast('狀態已更新', 'success')
  } catch (e) {
    showToast('更新失敗', 'error')
  }
}

onMounted(fetchOrders)
</script>

<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>訂單總覽中心</h1>
      <div class="header-actions">
        <button @click="$router.push('/admin/products')" class="sub-nav-btn">← 商品管理</button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <div v-else class="order-list">
      <div v-for="(items, batchId) in groupedOrders" :key="batchId" class="order-group glass-card">
        <div class="group-header">
          <span class="order-no"># {{ batchId }}</span>
          <span class="user-name">👤 {{ items[0].userName }}</span>
        </div>
        
        <div class="items-list">
          <ProductRow 
            v-for="it in items" 
            :key="it.pid + it.spec"
            :image="it.image_url || 'https://via.placeholder.com/200?text=No+Image'"
            :title="it.productName"
            :spec="it.spec"
            :price="Math.round(it.total / it.qty)"
            :qty="it.qty"
            :image-size="150"
          />
        </div>

        <div class="group-footer">
          <div class="status-selector">
            <select :value="items[0].status" @change="e => updateStatus(batchId, e.target.value)" class="status-select">
              <option value="未付款">未付款</option>
              <option value="已付款">已付款</option>
              <option value="已發貨">已發貨</option>
              <option value="已完成">已完成</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
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

.order-group {
  margin-bottom: 20px;
  padding: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--glass-border);
}

.order-no {
  font-weight: 800;
  font-family: monospace;
  color: var(--text-main);
}

.user-name {
  color: var(--text-sub);
  font-size: 0.9rem;
}

.items-list {
  margin-bottom: 16px;
}

.status-select {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255,255,255,0.5);
  border: 1px solid var(--glass-border);
  font-weight: 600;
  outline: none;
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

@keyframes rotate { to { transform: rotate(360deg); } }
</style>
