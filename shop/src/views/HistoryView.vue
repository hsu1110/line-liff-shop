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

    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="errMsg" class="error">{{ errMsg }}</div>
    <div v-else-if="orders.length === 0" class="empty">尚無訂單記錄</div>

    <div v-else class="order-list">
      <div v-for="(order, idx) in orders" :key="idx" class="order-card">
        
        <!-- 卡片頭部：單號與時間 -->
        <div class="card-header">
          <span class="order-id">#{{ order.order_id }}</span>
          <span class="time">{{ order.time }}</span>
        </div>

        <!-- 買家資訊 (雖然是自己的訂單，但還是顯示一下以確認) -->
        <div class="row user-info" v-if="order.user_name">
          <span class="label">買家:</span>
          <span class="value">{{ order.user_name }}</span>
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
.history-container { padding: 1rem; max-width: 600px; margin: 0 auto; }
.loading, .empty, .error { text-align: center; padding: 2rem; color: #666; }
.error { color: #ff5555; }

.order-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-left: 5px solid #06c755;
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.85rem;
  color: #888;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.order-id { font-family: monospace; font-weight: bold; }

.row {
  display: flex;
  margin-bottom: 4px;
}
.label { color: #888; margin-right: 8px; font-size: 0.9rem; }
.value { color: #333; font-size: 0.9rem; }

.content h3 {
  margin: 8px 0;
  font-size: 1.1rem;
  color: #333;
}

.details {
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.price-qty { color: #666; font-size: 0.95rem; }
.total { color: #ff5555; font-size: 1.2rem; font-weight: bold; }

.card-footer {
  margin-top: 12px;
  text-align: right;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
}
.status-badge.pending { background: #e6f7ff; color: #1890ff; }
.status-badge.done { background: #f6ffed; color: #52c41a; }
</style>
