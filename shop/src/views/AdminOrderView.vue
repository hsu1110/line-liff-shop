<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { showToast } from '../services/toast'

const orders = ref([])
const loading = ref(true)
const userId = liffService.getUser()?.userId

const fetchOrders = async () => {
  loading.value = true
  // 改為取得 ID Token
  const idToken = await liffService.getIDToken()
  try {
    const res = await api.adminGetAllOrders(idToken)
    orders.value = res.data.data
  } finally {
    loading.value = false
  }
}

// 將訂單按 batchId 分組
const groupedOrders = computed(() => {
  const groups = {}
  orders.value.forEach(o => {
    if (!groups[o.orderId]) groups[o.orderId] = []
    groups[o.orderId].push(o)
  })
  return groups
})

const updateStatus = async (orderId, newStatus) => {
  const idToken = await liffService.getIDToken()
  try {
    await api.adminUpdateOrder(idToken, orderId, newStatus)
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
    </div>

    <div v-else class="order-list">
      <div v-for="(items, batchId) in groupedOrders" :key="batchId" class="order-group glass-card">
        <div class="group-header">
          <span class="order-no"># {{ batchId }}</span>
          <span class="user-name">👤 {{ items[0].userName }}</span>
        </div>
        
        <div class="items-list">
          <div v-for="it in items" :key="it.pid + it.spec" class="item">
            <span class="name">{{ it.productName }}</span>
            <span class="spec">({{ it.spec }})</span>
            <span class="qty">x{{ it.qty }}</span>
          </div>
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

.item {
  display: flex;
  gap: 8px;
  font-size: 0.9rem;
  margin-bottom: 4px;
}

.item .name { flex: 1; }
.item .qty { font-weight: bold; color: var(--primary); }

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
