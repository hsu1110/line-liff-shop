<script setup>
import { computed } from 'vue'
import { useCartStore } from '../stores/cart'

import api from '../services/api'
import liff from '@line/liff'
import liffService from '../services/liff'
import { useRouter } from 'vue-router'

const router = useRouter()

const cartStore = useCartStore()

const items = computed(() => cartStore.items)

// 移除商品
function removeItem(index) {
  cartStore.removeFromCart(index)
}

const isProcessing = ref(false)

// 結帳功能
async function checkout() {
  if (cartStore.totalItems === 0 || isProcessing.value) return
  
  isProcessing.value = true
  try {
    const user = liffService.getUser()
    const userId = user?.userId || "UNKNOWN_USER"
    const userName = user?.displayName || "未知使用者"

    // 取得購物車資料並重組，僅傳送必要欄位
    const orderItems = items.value.map(item => ({
      pid: item.pid,
      spec: item.spec,
      qty: item.qty
    }))

    // 一次性送出整張訂單
    const res = await api.submitOrder({
      items: orderItems,
      userId: userId,
      userName: userName
    })

    if (res.data.status === 'success') {
      const orderId = res.data.orderId
      cartStore.clearCart()
      
      // 免費通知 (必須在 LIFF 內)
      if (liffService.isInClient()) {
        try {
          await liff.sendMessages([{
            type: 'text',
            text: `我已下單 #${orderId}`
          }])
          liff.closeWindow()
        } catch (err) {
          console.error('LIFF Send Error:', err)
          router.push({ name: 'history' })
        }
      } else {
        alert("訂單已送出！單號: #" + orderId)
        router.push({ name: 'history' })
      }
    } else {
      alert("結帳失敗: " + (res.data.message || '未知錯誤'))
    }
  } catch (e) {
    alert("系統連線錯誤: " + e)
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="cart-container">
    <h1>購物車</h1>

    <div v-if="items.length === 0" class="empty-cart">
      購物車是空的
    </div>

    <div v-else>
      <div v-for="(item, idx) in items" :key="idx" class="cart-item">
        <div class="img">
          <img :src="item.image_url" />
        </div>
        <div class="info">
          <h3>{{ item.name }}</h3>
          <p>{{ item.spec }}</p>
          <div class="price-qty">
            <span>$ {{ item.price }}</span>
            <span>x {{ item.qty }}</span>
          </div>
          <button @click="removeItem(idx)" class="del-btn">移除</button>
        </div>
      </div>
      
      <div class="footer">
        <div class="total">總計: $ {{ cartStore.totalPrice }}</div>
        <button 
          @click="checkout" 
          class="checkout-btn"
          :disabled="isProcessing"
        >
          {{ isProcessing ? '處理中...' : '送出訂單' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-container { padding: 1rem; padding-bottom: 80px; }
.cart-item {
  display: flex;
  background: white;
  padding: 10px;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.cart-item img {
  width: 90px; height: 90px; object-fit: cover; border-radius: 8px;
}
.info {
  flex: 1; margin-left: 12px;
}
.info h3 { margin: 0 0 5px 0; font-size: 1.1rem; color: #333; }
.price-qty {
  display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px;
  color: #ff5555;
}
.del-btn {
  background: #fff0f0; color: #ff5555; border: none; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; margin-top: 8px;
  font-weight: bold; cursor: pointer;
}
.footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
  padding: 16px 20px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
  display: flex; justify-content: space-between; align-items: center;
}
.total { font-weight: bold; font-size: 1.3rem; color: #333; }
.checkout-btn {
  background: linear-gradient(135deg, #06c755, #05b14c); color: white; border: none; padding: 12px 28px; border-radius: 25px; font-weight: bold;
  box-shadow: 0 4px 12px rgba(6, 199, 85, 0.3); transition: all 0.2s;
}
.checkout-btn:disabled {
  background: #ccc; box-shadow: none; cursor: not-allowed;
}
.checkout-btn:active {
  transform: scale(0.95);
}
</style>
