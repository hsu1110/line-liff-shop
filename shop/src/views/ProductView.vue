<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const cartStore = useCartStore()
const product = ref(null)
const loading = ref(true)
const qty = ref(1)
const spec = ref('')

onMounted(async () => {
  try {
    const res = await api.getProduct(route.params.id)
    if (res.data.status === 'success') {
      product.value = res.data.data
    } else {
      alert("商品不存在")
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function addToCart() {
  if (!product.value) return
  if (product.value.status === 'SOLD_OUT') return
  
  cartStore.addToCart(product.value, qty.value, spec.value || "單一規格")
  alert("已加入購物車！")
}

function updateQty(delta) {
  qty.value += delta
  if (qty.value < 1) qty.value = 1
}
</script>

<template>
  <div class="product-container" v-if="product">
    <div class="img-wrapper">
      <img :src="product.image_url" :alt="product.name" />
      <div v-if="product.status === 'SOLD_OUT'" class="sold-out-overlay">
        <span>SOLD OUT</span>
      </div>
      <button class="back-btn" @click="$router.back()">←</button>
    </div>
    
    <div class="info-card glass-card">
      <div class="header-row">
        <h1>{{ product.name }}</h1>
        <div class="price">$ {{ product.price }}</div>
      </div>
      
      <div class="divider"></div>

      <div class="form-section">
        <div class="form-group">
          <label>購買數量</label>
          <div class="qty-control glass-card">
            <button @click="updateQty(-1)">-</button>
            <input type="number" v-model="qty" readonly />
            <button @click="updateQty(1)">+</button>
          </div>
        </div>

        <div class="form-group">
          <label>商品規格</label>
          <input 
            type="text" 
            v-model="spec" 
            class="spec-input glass-card" 
            placeholder="請輸入：顏色、尺寸等" 
          />
        </div>
      </div>

      <button 
        class="add-btn" 
        :disabled="product.status === 'SOLD_OUT'"
        @click="addToCart"
      >
        <span v-if="product.status === 'SOLD_OUT'">已售完</span>
        <span v-else>加入購物車 🛒</span>
      </button>
    </div>
  </div>
  <div v-else class="loading-state">
    <div class="spinner"></div>
    <p>正在準備商品詳情</p>
  </div>
</template>

<style scoped>
.product-container {
  padding-bottom: 120px;
}

.img-wrapper {
  width: 100%;
  aspect-ratio: 1/1;
  background: #f0f0f0;
  position: relative;
}

.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(5px);
  font-size: 1.2rem;
  z-index: 10;
}

.sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sold-out-overlay span {
  padding: 12px 24px;
  border: 4px solid var(--text-main);
  font-weight: 900;
  font-size: 2rem;
  transform: rotate(-15deg);
}

.info-card {
  margin: -30px 20px 0;
  padding: 24px;
  position: relative;
  z-index: 5;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

h1 {
  font-size: 1.3rem;
  color: var(--text-main);
  line-height: 1.4;
}

.price {
  color: var(--accent);
  font-size: 1.6rem;
  font-weight: 800;
  white-space: nowrap;
}

.divider {
  height: 1px;
  background: var(--glass-border);
  margin-bottom: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-sub);
  margin-bottom: 8px;
}

.qty-control {
  display: flex;
  width: 140px;
  height: 44px;
  overflow: hidden;
}

.qty-control button {
  flex: 1;
  background: rgba(0,0,0,0.05);
  font-size: 1.2rem;
  font-weight: bold;
}

.qty-control input {
  width: 50px;
  text-align: center;
  background: none;
  border: none;
  font-size: 1.1rem;
  font-weight: 700;
}

.spec-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  font-size: 1rem;
  outline: none;
}

.spec-input:focus {
  border-color: var(--primary);
}

.add-btn {
  width: 100%;
  padding: 16px;
  background: var(--primary);
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(6, 199, 85, 0.3);
}

.add-btn:disabled {
  background: #b2bec3;
  box-shadow: none;
}

.loading-state {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--glass-border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}

@keyframes rotate { to { transform: rotate(360deg); } }
</style>
