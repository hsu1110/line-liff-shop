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
    <h1>我的訂單</h1>

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
h1 {
  font-size: 1.8rem;
  margin-bottom: 2rem;
  color: var(--text-main);
}
.loading-state, .empty, .error { text-align: center; padding: 3rem; color: var(--text-sub); }

/* Filter Bar Styles */
.filter-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 20px;
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
