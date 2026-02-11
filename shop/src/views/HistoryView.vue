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
      // 嘗試等待一下 init
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
        <div class="header">
          <span class="order-id">#{{ order.order_id }}</span>
          <span class="time">{{ order.time }}</span>
        </div>
        <div class="content">
          <h3>{{ order.item_name }}</h3>
          <p class="spec" v-if="order.spec">{{ order.spec }}</p>
          <div class="details">
            <span>$ {{ order.price }}</span>
            <span>x {{ order.qty }}</span>
            <span class="total">$ {{ order.total }}</span>
          </div>
        </div>
        <!-- 狀態標籤 (如果後端有回傳 status 欄位可顯示，目前先沒做) -->
        <div class="status-tag">處理中</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-container { padding: 1rem; }
.loading, .empty, .error { text-align: center; padding: 2rem; color: #666; }
.error { color: #ff5555; }

.order-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-left: 4px solid #06c755;
}

.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: #888;
}

.content h3 { margin: 0 0 4px 0; font-size: 1rem; }
.spec { font-size: 0.85rem; color: #666; margin: 0 0 8px 0; }

.details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}
.total { color: #ff5555; font-size: 1.1rem; }

.status-tag {
  margin-top: 8px;
  text-align: right;
  font-size: 0.8rem;
  color: #06c755;
  font-weight: bold;
}
</style>
