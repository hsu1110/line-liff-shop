<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'
import liffService from '../services/liff'

const orders = ref([])
const loading = ref(true)
const errMsg = ref('')

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
</script>

<template>
  <div class="history-container">
    <h1>我的訂單</h1>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>
    <div v-else-if="errMsg" class="error">{{ errMsg }}</div>
    <div v-else-if="orders.length === 0" class="empty">尚無訂單記錄</div>

    <div v-else class="order-list">
      <div v-for="(order, idx) in orders" :key="idx" class="order-card glass-card">
        
        <!-- 卡片頭部：單號與時間 -->
        <div class="card-header">
          <span class="order-id">#{{ order.order_id }}</span>
          <span class="time">{{ order.time }}</span>
        </div>

        <!-- 商品內容 -->
        <div class="content">
          <h3>{{ order.item_name }}</h3>
          <div class="row" v-if="order.spec">
            <span class="label">規格:</span>
            <span class="value">{{ order.spec }}</span>
          </div>
          
          <div class="row details">
            <span class="price-qty">
              $ {{ Math.round(order.total / order.qty) }} x {{ order.qty }}
            </span>
            <span class="total">$ {{ order.total }}</span>
          </div>
        </div>

        <!-- 狀態與總結 -->
        <div class="card-footer">
          <span class="status-badge" :class="order.order_status === '已完成' ? 'done' : 'pending'">
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

.row {
  display: flex;
  margin-bottom: 4px;
}
.label { color: var(--text-sub); margin-right: 8px; font-size: 0.85rem; }
.value { color: var(--text-main); font-size: 0.85rem; font-weight: 600; }

.content h3 {
  margin: 8px 0;
  font-size: 1.05rem;
  color: var(--text-main);
}

.details {
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.price-qty { color: var(--text-sub); font-size: 0.9rem; }
.total { color: var(--accent); font-size: 1.3rem; font-weight: 800; }

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
.status-badge.done { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
</style>
