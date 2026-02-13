import { defineStore } from 'pinia'
import axios from 'axios'
import api from '../services/api'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    lastFetchTime: 0,
    loading: false,
    error: null
  }),
  
  getters: {
    // 5 分鐘內視為有效快取
    isStale: (state) => {
      return Date.now() - state.lastFetchTime > 5 * 60 * 1000
    },
    
    availableProducts: (state) => {
      return state.products.filter(p => p.status === 'AVAILABLE' || p.status === 'SOLD_OUT')
    }
  },
  
  actions: {
    async fetchProducts(force = false) {
      // 如果資料還很新，且不強制更新，就直接用快取
      if (!force && !this.loading && this.products.length > 0 && !this.isStale) {
        return
      }
      
      this.loading = true
      this.error = null
      
      try {
        const res = await api.getProducts()
        if (res.data.status === 'success') {
          this.products = res.data.data
          this.lastFetchTime = Date.now()
        } else {
          throw new Error(res.data.message || '取得商品失敗')
        }
      } catch (e) {
        console.error(e)
        // 如果失敗但有舊資料，保留舊資料 (Stale-While-Revalidate 降級策略)
        if (this.products.length === 0) {
            this.error = e.message || '網路連線錯誤'
        }
      } finally {
        this.loading = false
      }
    },
    
    // 提供給 HomeView 做樂觀更新或初始化檢查
    init() {
      // 背景更新：如果有資料先顯示，但還是偷發一個請求更新
      if (this.products.length > 0) {
          this.fetchProducts(true).catch(()=>{})
      } else {
          return this.fetchProducts()
      }
    }
  }
})
