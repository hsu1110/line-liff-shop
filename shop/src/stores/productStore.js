import { defineStore } from 'pinia'
import api from '../services/api'
import liffService from '../services/liff'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    lastFetchTime: 0,
    loading: false,
    error: null
  }),

  getters: {
    // 取得所有商品
    allProducts: (state) => state.products,
    
    // 取得上架中的商品 (Available & Sold Out for display)
    displayProducts: (state) => state.products.filter(p => 
      p.status === 'AVAILABLE' || p.status === 'SOLD_OUT'
    ),

    // 依 PID 取得單一商品
    getProductByPid: (state) => (pid) => {
      return state.products.find(p => p.pid === pid)
    }
  },

  actions: {
    /**
     * 獲取商品列表 (含快取機制)
     * @param {boolean} forceRefresh 強制重新抓取
     */
    async fetchProducts(forceRefresh = false) {
      const now = Date.now()
      const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取

      // 如果有資料且未過期，且不強制更新，則直接回傳現有資料
      if (!forceRefresh && this.products.length > 0 && (now - this.lastFetchTime < CACHE_DURATION)) {
        console.log('Using cached products');
        return
      }

      this.loading = true
      this.error = null

      try {
        // API method is getProducts()
        const res = await api.getProducts()
        
        if (res.data && res.data.status === 'success' && Array.isArray(res.data.data)) {
          this.products = res.data.data
          this.lastFetchTime = now
        }
      } catch (err) {
        console.error('Fetch products error:', err)
        this.error = '無法載入商品列表'
      } finally {
        this.loading = false
      }
    },

    /**
     * 更新單一商品 (通常用於管理員編輯後手動更新 Store，避免重抓全部)
     */
    updateProductInStore(updatedProduct) {
      const index = this.products.findIndex(p => p.pid === updatedProduct.pid)
      if (index !== -1) {
        // 更新現有
        this.products[index] = { ...this.products[index], ...updatedProduct }
      } else {
        // 新增
        this.products.unshift(updatedProduct)
      }
    },

    /**
     * 刪除單一商品
     */
    removeProductFromStore(pid) {
      this.products = this.products.filter(p => p.pid !== pid)
    }
  }
})
