<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { optimizeImage } from '../services/image'

const props = defineProps({
  show: Boolean,
  product: Object, // null for Add mode
  submitting: Boolean
})

const emit = defineEmits(['close', 'save'])

const isEditMode = computed(() => !!props.product)

const form = reactive({
  pid: '',
  name: '',
  price: '',
  description: '',
  status: 'AVAILABLE',
  image_url: '',
  imageBase64: ''
})

// Initialize form when product changes or modal opens
watch(() => props.product, (newVal) => {
  if (newVal) {
    // Edit Mode
    form.pid = newVal.pid
    form.name = newVal.name
    form.price = newVal.price
    form.description = newVal.description || ''
    form.status = newVal.status
    form.image_url = newVal.image_url
    form.imageBase64 = ''
  } else {
    // Add Mode (Reset)
    form.pid = ''
    form.name = ''
    form.price = ''
    form.description = ''
    form.status = 'AVAILABLE'
    form.image_url = ''
    form.imageBase64 = ''
  }
}, { immediate: true })

// Handle Image Upload
const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (!file) return

  if (file.size > 1024 * 1024 * 5) { // 5MB limit
    alert('圖片大小不能超過 5MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    form.imageBase64 = event.target.result // Data URL (Base64)
    form.image_url = event.target.result // Preview immediately
  }
  reader.readAsDataURL(file)
}

const handleSubmit = () => {
  if (!form.name || !form.price) {
    alert('請填寫完整資訊')
    return
  }
  
  // Clone form data
  const formData = { ...form }
  
  // If image_url is Base64 (preview), do not send it as image_url
  // Backend expects imageBase64 for upload, or a valid http URL for image_url
  if (formData.image_url && formData.image_url.startsWith('data:')) {
    formData.image_url = ''
  }

  emit('save', formData)
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content glass-card">
      <h2>{{ isEditMode ? '編輯商品' : '新增商品' }}</h2>
      
      <div class="form-group image-upload">
        <label for="p-image-modal" class="image-preview" :style="{ backgroundImage: `url(${optimizeImage(form.image_url, 600)})` }">
          <div v-if="!form.image_url" class="placeholder">
            <span>+</span>
            <p>點擊上傳照片</p>
          </div>
        </label>
        <input type="file" id="p-image-modal" accept="image/*" @change="handleFileChange" hidden>
      </div>

      <div class="form-group">
        <label>商品名稱</label>
        <input v-model="form.name" type="text" placeholder="例如: 日本限定零食" />
      </div>

      <div class="form-group">
        <label>價格 ($)</label>
        <input v-model="form.price" type="number" placeholder="0" />
      </div>
      
      <div class="form-group">
        <label>商品描述</label>
        <textarea v-model="form.description" rows="3" placeholder="輸入商品介紹..."></textarea>
      </div>

      <div class="form-group">
        <label>狀態</label>
        <select v-model="form.status">
          <option value="AVAILABLE">上架中 (Available)</option>
          <option value="SOLD_OUT">已售完 (Sold Out)</option>
          <option value="TEMP">暫存 (Draft/Hidden)</option>
        </select>
      </div>

      <div class="modal-actions">
        <button @click="emit('close')" class="cancel-btn" :disabled="submitting">取消</button>
        <button @click="handleSubmit" class="save-btn" :disabled="submitting">
          {{ submitting ? '儲存中...' : '儲存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: white;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
  border-radius: 16px;
}

.modal-content h2 {
  margin-bottom: 20px;
  text-align: center;
  color: var(--text-main);
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-sub);
  font-size: 0.9rem;
}

.form-group input, 
.form-group textarea, 
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: #f8f9fa;
  font-size: 1rem;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

/* Image Upload */
.image-upload {
  display: flex;
  justify-content: center;
}

.image-preview {
  width: 100%;
  height: 200px;
  background-color: #f1f2f6;
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s;
}

.image-preview:hover {
  border-color: var(--primary);
}

.placeholder {
  text-align: center;
  color: #aaa;
}
.placeholder span {
  font-size: 2rem;
  display: block;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn, .save-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
}

.cancel-btn {
  background: #f1f2f6;
  color: var(--text-sub);
}

.save-btn {
  background: var(--primary);
  color: white;
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
