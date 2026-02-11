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
      <div v-if="product.status === 'SOLD_OUT'" class="sold-out-overlay">SOLD OUT</div>
    </div>
    
    <div class="info">
      <h1>{{ product.name }}</h1>
      <p class="price">$ {{ product.price }}</p>
      
      <div class="form-group">
        <label>數量</label>
        <div class="qty-control">
          <button @click="updateQty(-1)">-</button>
          <input type="number" v-model="qty" readonly />
          <button @click="updateQty(1)">+</button>
        </div>
      </div>

      <div class="form-group">
        <label>規格</label>
        <input type="text" v-model="spec" placeholder="例如：紅色 s號" />
      </div>

      <button 
        class="add-btn" 
        :disabled="product.status === 'SOLD_OUT'"
        @click="addToCart"
      >
        {{ product.status === 'SOLD_OUT' ? '已售完' : '加入購物車' }}
      </button>
    </div>
  </div>
  <div v-else class="loading">Loading...</div>
</template>

<style scoped>
.product-container {
  padding-bottom: 80px;
}
.img-wrapper {
  width: 100%;
  aspect-ratio: 1/1;
  background: #eee;
  position: relative;
}
.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info {
  padding: 1rem;
}
.price {
  color: #ff5555;
  font-size: 1.5rem;
  font-weight: bold;
}
.form-group {
  margin-bottom: 1rem;
}
.qty-control {
  display: flex;
  width: 120px;
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.qty-control button {
  width: 35px;
  border: none;
  background: #f0f0f0;
  font-size: 1.2rem;
}
.qty-control input {
  flex: 1;
  text-align: center;
  border: none;
  font-size: 1rem;
}
.add-btn {
  width: 100%;
  padding: 15px;
  background: #06c755;
  color: white;
  border: none;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 8px;
  margin-top: 1rem;
}
.add-btn:disabled {
  background: #ccc;
}
</style>
