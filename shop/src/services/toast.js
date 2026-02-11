import { ref } from 'vue'

// 輕量化的全局狀態管理，不需要拼 Pinia 這麼大
export const toastRef = ref(null)

export const showToast = (message, type = 'info', duration = 3000) => {
  if (toastRef.value) {
    toastRef.value.show(message, type, duration)
  }
}
