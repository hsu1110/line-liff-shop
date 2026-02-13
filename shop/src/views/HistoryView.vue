<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'
import ProductRow from '../components/ProductRow.vue'

const orders = ref([])
const loading = ref(true)
const errMsg = ref('')
const currentFilter = ref('全部')

const FILTER_TABS = ['全部', '處理中', '已發貨', '已完成', '已取消']

// 根據 currentFilter 篩選訂單
const filteredOrders = computed(() => {
  if (currentFilter.value === '全部') return orders.value
  return orders.value.filter(o => o.order_status === currentFilter.value)
})

onMounted(async () => {
  try {
    // 確保有 User ID
    if (!liffService.profile) {
      await liffService.init(); 
    }
    
    const user = liffService.getUser()
    if (!user || !user.userId) {
      errMsg.value = "無法取得使用者資訊，請重新登入"
      loading.value = false
      return
    }

    const res = await api.getOrders(user.userId)
    if (res.data.status === 'success') {
      orders.value = res.data.data
    } else {
      errMsg.value = res.data.message
    }
  } catch (e) {
    console.error(e)
    errMsg.value = "讀取失敗，請稍後再試"
  } finally {
    loading.value = false
  }
})

const orderStats = computed(() => {
  const stats = { total: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 }
  const uniqueOrders = new Map()

  orders.value.forEach(o => {
    if (!uniqueOrders.has(o.order_id)) {
      uniqueOrders.set(o.order_id, o.order_status)
    }
  })

  stats.total = uniqueOrders.size
  uniqueOrders.forEach(status => {
    if (!status || status === '處理中') stats.processing++
    else if (status === '已發貨') stats.shipped++
    else if (status === '已完成') stats.completed++
    else if (status === '已取消') stats.cancelled++
  })

  return stats
})

// 狀態樣式對照
const getStatusClass = (status) => {
  switch (status) {
    case '已完成': return 'done'
    case '已發貨': return 'shipped'
    case '已取消': return 'cancelled'
    default: return 'pending' // 處理中
  }
}
</script>

<template>
  <div class="history-container">
    <header class="admin-header glass-card">
      <div class="header-main">
        <div class="header-info">
          <h1>我的訂單</h1>
          <p class="admin-subtitle">查看訂單紀錄與配送狀態</p>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">總訂單</span>
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
    <div v-else-if="errMsg" class="error">{{ errMsg }}</div>
    <div v-else-if="filteredOrders.length === 0" class="empty">
      {{ currentFilter === '全部' ? '尚無訂單記錄' : `沒有「${currentFilter}」的訂單` }}
    </div>

    <div v-else class="order-list">
      <div v-for="(order, idx) in filteredOrders" :key="idx" class="order-card glass-card">
        
        <!-- 卡片頭部：單號與時間 -->
        <div class="card-header">
          <span class="order-id">#{{ order.order_id }}</span>
          <span class="time">{{ order.time }}</span>
        </div>

        <!-- 商品內容 (使用 ProductRow) -->
        <ProductRow 
          :image="order.image_url || 'https://via.placeholder.com/200?text=No+Image'" 
          :title="order.item_name"
          :spec="order.spec"
          :price="Math.round(order.total / order.qty)"
          :qty="order.qty"
          :image-size="200"
        >
          <template #footer>
            <div class="total-row">小計: $ {{ order.total }}</div>
          </template>
        </ProductRow>

        <!-- 狀態與總結 -->
        <div class="card-footer">
          <span class="status-badge" :class="getStatusClass(order.order_status)">
            {{ order.order_status || '處理中' }}
          </span>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.history-container { 
  padding: 1.5rem; 
  max-width: 600px; 
  margin: 0 auto;
  padding-bottom: 120px;
}

/* Unified Header Styles */
.admin-header {
  padding: 24px;
  margin-bottom: 24px;
  border-radius: 20px;
}

.header-main {
  margin-bottom: 20px;
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

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  padding-top: 16px;
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
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
}

.stat-value.processing { color: #f39c12; }
.stat-value.shipped { color: #3498db; }
.stat-value.completed { color: var(--primary); }
.stat-value.cancelled { color: #95a5a6; }

.stat-divider {
  width: 1px;
  height: 30px;
  background: var(--glass-border);
}

.loading-state, .empty, .error { text-align: center; padding: 3rem; color: var(--text-sub); }

/* Filter Bar Styles */
.filter-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 16px 0;
  margin-bottom: 12px;
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
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid var(--glass-border);
  transition: all 0.2s;
}

.filter-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--glass-border);
  border-top-color: var(--primary);
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.order-card {
  margin-bottom: 16px;
  padding: 16px;
  border-left: 5px solid var(--primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.8rem;
  color: var(--text-sub);
  border-bottom: 1px solid var(--glass-border);
  padding-bottom: 8px;
}

.order-id { font-family: monospace; font-weight: 800; color: var(--text-main); }

.total-row {
  font-weight: bold;
  color: var(--text-main);
  text-align: right;
  margin-top: 4px;
  font-size: 0.9rem;
}

.card-footer {
  margin-top: 12px;
  text-align: right;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 800;
}
.status-badge.pending { background: rgba(0, 122, 255, 0.1); color: #007aff; }
.status-badge.shipped { background: rgba(255, 149, 0, 0.1); color: #ff9500; }
.status-badge.done { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
.status-badge.cancelled { background: rgba(142, 142, 147, 0.1); color: #8e8e93; text-decoration: line-through; }
</style>
