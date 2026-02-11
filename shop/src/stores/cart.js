import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  
  // Getters
  const totalItems = computed(() => {
    return items.value.reduce((acc, item) => acc + item.qty, 0)
  })
  
  const totalPrice = computed(() => {
    return items.value.reduce((acc, item) => acc + (item.price * item.qty), 0)
  })
  
  // Actions
  function addToCart(product, qty, spec) {
    const existing = items.value.find(item => item.pid === product.pid && item.spec === spec)
    if (existing) {
      existing.qty += qty
    } else {
      items.value.push({
        pid: product.pid,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        qty: qty,
        spec: spec
      })
    }
  }
  
  function removeFromCart(index) {
    items.value.splice(index, 1)
  }
  
  function clearCart() {
    items.value = []
  }

  return { items, totalItems, totalPrice, addToCart, removeFromCart, clearCart }
})
