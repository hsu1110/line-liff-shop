import axios from 'axios'

// 引用原本的 GAS 網址 (從 index.html 抄來的)
const API_URL = "https://script.google.com/macros/s/AKfycbza_R4p07vetWGk44_P1rnqZh4-oZ4vN7Od74MUP7x0hvIGNTcTNwPx1haaCtBFzPej/exec";

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
  
  // (Future) 取得商品列表 - 需擴充 GAS
  getProducts() {
    return apiClient.get('', {
      params: { action: 'getProducts' }
    })
  }
}
