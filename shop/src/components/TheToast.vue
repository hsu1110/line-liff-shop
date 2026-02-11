<script setup>
import { ref } from 'vue'

const isVisible = ref(false)
const message = ref('')
const type = ref('info') // info, success, error

const show = (msg, t = 'info', duration = 3000) => {
  message.value = msg
  type.value = t
  isVisible.value = true
  
  setTimeout(() => {
    isVisible.value = false
  }, duration)
}

// 暴露 show 函式給外部
defineExpose({ show })
</script>

<template>
  <Transition name="toast">
    <div v-if="isVisible" class="toast-wrapper" :class="type">
      <div class="toast-content glass-card">
        <span class="icon">
          <template v-if="type === 'success'">✅</template>
          <template v-else-if="type === 'error'">❌</template>
          <template v-else>ℹ️</template>
        </span>
        <span class="message">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-wrapper {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  min-width: 280px;
}

.toast-content {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85); /* 稍微亮一點，與背景區隔 */
}

.message {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
}

/* 轉場動畫 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

/* 不同類型的裝飾 */
.success .toast-content {
  border-left: 4px solid var(--primary);
}

.error .toast-content {
  border-left: 4px solid var(--accent);
}
</style>
