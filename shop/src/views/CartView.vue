<script setup>
import { computed } from 'vue'
import { useCartStore } from '../stores/cart'
import api from '../services/api'
import liff from '@line/liff'

const cartStore = useCartStore()

const items = computed(() => cartStore.items)

// 移除商品
function removeItem(index) {
  cartStore.removeFromCart(index)
}

// 結帳功能
async function checkout() {
  if (cartStore.totalItems === 0) return
  
  try {
    // 取得使用者資料
    let userId = "BROWSER_TEST_USER"
    let userName = "Browser User"
    
    if (liff.isInClient()) {
      const profile = await liff.getProfile()
      userId = profile.userId
      userName = profile.displayName
    }

    // 每一筆都要送出訂單 (目前的後端只支援單筆)
    // 之後後端升級可以一次送整包
    for (const item of items.value) {
      await api.submitOrder({
        pid: item.pid,
        userId: userId,
        userName: userName,
        spec: item.spec,
        qty: item.qty
      })
    }

    alert("訂單已送出！")
    cartStore.clearCart()
    
    // 免費通知 (Optional)
    if (liff.isInClient()) {
       liff.sendMessages([{
         type: 'text',
         text: '我已下單 (來自 V2 商城)'
       }])
       .then(() => liff.closeWindow())
       .catch((err) => {
         console.error(err)
         liff.closeWindow()
       })
    }

  } catch (e) {
    alert("結帳失敗: " + e)
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
        <button @click="checkout" class="checkout-btn">送出訂單</button>
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
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.cart-item img {
  width: 80px; height: 80px; object-fit: cover; border-radius: 4px;
}
.info {
  flex: 1; margin-left: 10px;
}
.info h3 { margin: 0 0 5px 0; font-size: 1rem; }
.price-qty {
  display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px;
}
.del-btn {
  background: #ff5555; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-top: 5px;
}
.footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white; padding: 15px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  display: flex; justify-content: space-between; align-items: center;
}
.total { font-weight: bold; font-size: 1.2rem; }
.checkout-btn {
  background: #06c755; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold;
}
</style>
