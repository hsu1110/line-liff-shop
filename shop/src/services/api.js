import axios from 'axios'

// 使用環境變數 (Vite)
// 使用環境變數 (Vite)
const API_URL = import.meta.env.VITE_API_URL || "https://script.google.com/macros/s/AKfycbza_R4p07vetWGk44_P1rnqZh4-oZ4vN7Od74MUP7x0hvIGNTcTNwPx1haaCtBFzPej/exec";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'text/plain' // GAS work around to avoid CORS preflight sometimes
  }
})

export default {
  // 取得單一商品 (目前 API 只有 getProduct)
  getProduct(pid) {
    return apiClient.get('', {
      params: { action: 'getProduct', pid }
    })
  },
  
  // 送出訂單
  submitOrder(orderData) {
    return apiClient.post('', JSON.stringify({
      action: 'submitOrder',
      data: orderData
    }))
  },

  // --- 管理員 API (改回傳送 userId) ---
  checkAdmin(userId) {
    return apiClient.post('', JSON.stringify({
      action: 'checkAdmin',
      userId: userId
    }))
  },
  adminAddProduct(userId, productData) {
    return apiClient.post('', JSON.stringify({
      action: 'adminAddProduct',
      userId: userId,
      data: productData
    }))
  },
  adminUpdateProduct(userId, productData) {
    return apiClient.post('', JSON.stringify({
      action: 'adminUpdateProduct',
      userId: userId,
      data: productData
    }))
  },
  adminDeleteProduct(userId, pid) {
    return apiClient.post('', JSON.stringify({
      action: 'adminDeleteProduct',
      userId: userId,
      pid: pid
    }))
  },
  adminGetAllOrders(userId) {
    return apiClient.post('', JSON.stringify({
      action: 'adminGetAllOrders',
      userId: userId
    }))
  },
  adminUpdateOrder(userId, orderId, status) {
    return apiClient.post('', JSON.stringify({
      action: 'adminUpdateOrder',
      userId: userId,
      orderId: orderId,
      status: status
    }))
  },
  
  // (Future) 取得商品列表 - 需擴充 GAS
  getProducts() {
    return apiClient.get('', {
      params: { action: 'getProducts' }
    })
  },

  // 取得訂單記錄 (V2)
  getOrders(userId) {
    return apiClient.get('', {
      params: { action: 'getOrders', userId }
    })
  }
}
