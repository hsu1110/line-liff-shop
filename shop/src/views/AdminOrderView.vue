<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import { showToast } from '../services/toast'
import ProductRow from '../components/ProductRow.vue'

const orders = ref([])
const loading = ref(true)
const updatingOrderId = ref(null) // 用於追蹤正在更新的訂單
const currentFilter = ref('全部') // 當前篩選狀態

const FILTER_TABS = ['全部', '處理中', '已發貨', '已完成', '已取消']

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

// 將訂單按 batchId 分組，並根據篩選器過濾
const groupedOrders = computed(() => {
  const groups = {}
  if (!orders.value || !Array.isArray(orders.value)) return groups
  
  // 先篩選
  const filtered = currentFilter.value === '全部' 
    ? orders.value 
    : orders.value.filter(o => o.status === currentFilter.value)

  // 再分組
  filtered.forEach(o => {
    if (!groups[o.orderId]) groups[o.orderId] = []
    groups[o.orderId].push(o)
  })
  return groups
})

const orderStats = computed(() => {
  const stats = { total: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 }
  const uniqueOrders = new Map()

  orders.value.forEach(o => {
    if (!uniqueOrders.has(o.orderId)) {
      uniqueOrders.set(o.orderId, o.status)
    }
  })

  stats.total = uniqueOrders.size
  uniqueOrders.forEach(status => {
    if (status === '處理中') stats.processing++
    else if (status === '已發貨') stats.shipped++
    else if (status === '已完成') stats.completed++
    else if (status === '已取消') stats.cancelled++
  })

  return stats
})

const updateStatus = async (orderId, newStatus) => {
  if (updatingOrderId.value) return // 防止重複點擊
  
  updatingOrderId.value = orderId
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
  } finally {
    updatingOrderId.value = null
  }
}

onMounted(fetchOrders)
</script>

<template>
  <div class="admin-container">
    <header class="admin-header glass-card">
      <div class="header-main">
        <div class="header-info">
          <h1>訂單總覽中心</h1>
          <p class="admin-subtitle">處理客戶訂單與物流狀態</p>
        </div>
        <div class="header-btns">
          <button @click="$router.push('/admin/products')" class="sub-nav-btn">
            ← 商品管理中心
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">總訂單數</span>
          <span class="stat-value">{{ orderStats.total }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">處理中</span>
          <span class="stat-value processing">{{ orderStats.processing }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已發貨</span>
          <span class="stat-value shipped">{{ orderStats.shipped }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已完成</span>
          <span class="stat-value completed">{{ orderStats.completed }}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">已取消</span>
          <span class="stat-value cancelled">{{ orderStats.cancelled }}</span>
        </div>
      </div>
    </header>

    <!-- 篩選標籤列 -->
    <div class="filter-bar">
      <button 
        v-for="tab in FILTER_TABS" 
        :key="tab"
        class="filter-tab"
        :class="{ active: currentFilter === tab }"
        @click="currentFilter = tab"
      >
        {{ tab }}
      </button>
    </div>

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
            <!-- Loading 狀態顯示 -->
            <div v-if="updatingOrderId === batchId" class="updating-status">
              <div class="mini-spinner"></div>
              <span>更新中...</span>
            </div>
            
            <!-- 狀態選單 -->
            <select 
              v-else
              :value="items[0].status" 
              @change="e => updateStatus(batchId, e.target.value)" 
              class="status-select"
            >
              <option value="處理中">處理中</option>
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
  padding: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 120px;
}

.admin-header {
  padding: 24px;
  margin-bottom: 32px;
  border-radius: 20px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-info h1 {
  font-size: 1.5rem;
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

.sub-nav-btn:hover {
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

.stat-value.processing { color: #f39c12; } /* Orange-ish */
.stat-value.shipped { color: #3498db; }    /* Blue-ish */
.stat-value.completed { color: var(--primary); }
.stat-value.cancelled { color: #95a5a6; }  /* Gray-ish */

.stat-divider {
  width: 1px;
  height: 30px;
  background: var(--glass-border);
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

/* Filter Bar Styles */
.filter-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 20px;
  /* 隱藏捲軸但保留功能 */
  scrollbar-width: none; 
  -ms-overflow-style: none;
}
.filter-bar::-webkit-scrollbar { display: none; }

.filter-tab {
  white-space: nowrap;
  padding: 6px 16px;
  border-radius: 20px;
  background: white;
  color: var(--text-sub);
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid var(--glass-border);
  transition: all 0.2s;
}

.filter-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Mini Spinner for Update Status */
.updating-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-sub);
  font-size: 0.9rem;
  justify-content: flex-end;
}

.mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--glass-border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}
</style>
