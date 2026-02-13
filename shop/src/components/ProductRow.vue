<script setup>
import { optimizeImage } from '../services/image'

defineProps({
  image: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  spec: {
    type: String, // 規格 (可選)
    default: ''
  },
  price: {
    type: Number,
    required: true
  },
  qty: {
    type: Number,
    required: true
  },
  // 讓外部可以自訂縮圖大小
  imageSize: {
    type: Number,
    default: 200
  }
})

defineEmits(['click'])
</script>

<template>
  <div class="product-row glass-card" @click="$emit('click')">
    <!-- 左側縮圖 -->
    <div class="img-box">
      <img :src="optimizeImage(image, imageSize)" loading="lazy" />
    </div>

    <!-- 中間資訊 -->
    <div class="info">
      <h3>{{ title }}</h3>
      <p v-if="spec" class="spec">{{ spec }}</p>
      
      <div class="price-row">
        <span class="price">$ {{ price }}</span>
        <div class="qty-tag">x {{ qty }}</div>
      </div>
      
      <!-- 預留給像是「總價」或「移除按鈕」的空間 -->
      <div class="row-footer">
        <slot name="footer"></slot>
      </div>
    </div>

    <!-- 右側動作區 (例如：移除按鈕或狀態標籤) -->
    <div class="actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<style scoped>
.product-row {
  display: flex;
  padding: 12px;
  margin-bottom: 12px;
  gap: 12px;
  align-items: center; /* 垂直置中 */
}

.img-box {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;
}

.img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0; /* 防止 flex item 溢出 */
}

.info h3 {
  font-size: 0.95rem;
  margin-bottom: 4px;
  color: var(--text-main);
  /* 單行省略 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spec {
  font-size: 0.8rem;
  color: var(--text-sub);
  margin-bottom: 4px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price {
  color: var(--accent);
  font-weight: 700;
}

.qty-tag {
  background: rgba(0,0,0,0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--text-sub);
}

.row-footer {
  margin-top: 4px;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
</style>
