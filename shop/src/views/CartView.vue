<script setup>
import { ref, computed } from 'vue'
import { useCartStore } from '../stores/cart'
import api from '../services/api'
import liff from '@line/liff'
import liffService from '../services/liff'
import { useRouter } from 'vue-router'
import { optimizeImage } from '../services/image'
import { showToast } from '../services/toast'
import ProductRow from '../components/ProductRow.vue'

const router = useRouter()
const cartStore = useCartStore()
const items = computed(() => cartStore.items)
const isSubmitting = ref(false)

// 移除商品
function removeItem(index) {
  cartStore.removeFromCart(index)
}

// 結帳功能 (重構為批次發送)
async function checkout() {
  if (cartStore.totalItems === 0 || isSubmitting.value) return
  
  isSubmitting.value = true
  try {
    const user = liffService.getUser()
    const userId = user?.userId || "UNKNOWN_USER"
    const userName = user?.displayName || "未知使用者"

    // 準備批次資料格式，與 GAS Code.js:367 匹配
    const orderPayload = {
      userId: userId,
      userName: userName,
      items: items.value.map(it => ({
        pid: it.pid,
        spec: it.spec,
        qty: it.qty
      }))
    }

    const res = await api.submitOrder(orderPayload)
    
    if (res.data.status === 'success') {
      const batchOrderId = res.data.orderId
      cartStore.clearCart()
      
      // LINE 內傳送訊息通知
      if (liffService.isInClient()) {
        try {
          await liff.sendMessages([{
            type: 'text',
            text: `我已下單 #${batchOrderId}`
          }])
          liff.closeWindow()
        } catch (err) {
          console.error('LIFF Send Error:', err)
          router.push({ name: 'history' })
        }
      } else {
        showToast("訂單已送出！單號: " + batchOrderId, 'success')
        router.push({ name: 'history' })
      }
    } else {
      throw new Error(res.data.message || "下單失敗")
    }

  } catch (e) {
    showToast("結帳失敗: " + e.message, 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="cart-container">
    <header class="cart-header">
      <h1>購物車</h1>
      <span class="count">{{ cartStore.totalItems }} 件商品</span>
    </header>

    <div v-if="items.length === 0" class="empty-cart glass-card">
      <div class="icon">🛒</div>
      <p>購物車目前空空如也</p>
      <router-link to="/" class="go-shop-btn">去逛逛</router-link>
    </div>

    <div v-else class="cart-list">
      <ProductRow 
        v-for="(item, idx) in items" 
        :key="idx" 
        :image="item.image_url"
        :title="item.name"
        :spec="item.spec"
        :price="item.price"
        :qty="item.qty"
        :image-size="200"
      >
        <template #actions>
          <button @click="removeItem(idx)" class="del-btn">移除</button>
        </template>
      </ProductRow>
      
      <div class="checkout-footer glass-card">
        <div class="total-info">
          <span class="label">應付總額</span>
          <span class="amount">$ {{ cartStore.totalPrice }}</span>
        </div>
        <button 
          @click="checkout" 
          class="checkout-btn" 
          :disabled="isSubmitting"
        >
          <span v-if="!isSubmitting">確認下單</span>
          <span v-else class="loading-dots">處理中</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-container {
  padding: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2rem;
}

.cart-header h1 {
  font-size: 1.8rem;
  color: var(--text-main);
}

.cart-header .count {
  color: var(--text-sub);
  font-size: 0.9rem;
}

.empty-cart {
  padding: 3rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-cart .icon { font-size: 3rem; opacity: 0.3; }

.go-shop-btn {
  margin-top: 1rem;
  background: var(--primary);
  color: white;
  padding: 10px 30px;
  border-radius: 20px;
  font-weight: 600;
}

/* ProductRow handles item styles */

.cart-list {
  padding-bottom: 100px; /* 避免被 footer 擋住 */
}

.del-btn {
  color: #ff7675;
  font-size: 0.8rem;
  background: none; /* 或者是個按鈕 */
  border: 1px solid #ff7675;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.checkout-footer {
  position: fixed;
  bottom: calc(100px + var(--safe-bottom));
  left: 20px;
  right: 20px;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
}

.total-info {
  display: flex;
  flex-direction: column;
}

.total-info .label {
  font-size: 0.8rem;
  color: var(--text-sub);
}

.total-info .amount {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
}

.checkout-btn {
  background: var(--primary);
  color: white;
  padding: 12px 32px;
  border-radius: 16px;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(6, 199, 85, 0.3);
}

.checkout-btn:disabled {
  background: #b2bec3;
  box-shadow: none;
}
</style>
