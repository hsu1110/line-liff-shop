<script setup>
import { computed } from 'vue'
import { optimizeImage } from '../services/image'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  showStatus: {
    type: Boolean,
    default: true
  },
  imageSize: {
    type: Number,
    default: 400
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click', props.product)
}

const statusText = computed(() => {
  switch (props.product.status) {
    case 'AVAILABLE': return '現貨'
    case 'SOLD_OUT': return '已售完'
    default: return '下架'
  }
})
</script>

<template>
  <div class="product-card glass-card" @click="handleClick">
    <!-- 圖片區塊 -->
    <div class="img-wrapper">
      <img 
        :src="optimizeImage(product.image_url, imageSize)" 
        :alt="product.name" 
        loading="lazy" 
      />
      
      <!-- 售完蓋板 -->
      <div v-if="product.status === 'SOLD_OUT'" class="sold-out-overlay">
        <span>SOLD OUT</span>
      </div>
      
      <!-- 價格標籤 -->
      <div class="price-tag">$ {{ product.price }}</div>
    </div>

    <!-- 資訊區塊 -->
    <div class="p-info">
      <h3 class="title">{{ product.name }}</h3>
      
      <div class="card-footer">
        <slot name="footer">
          <!-- 預設內容：狀態與箭頭 -->
          <span v-if="showStatus" class="status-tag" :class="product.status">
            {{ statusText }}
          </span>
          <div class="go-btn">→</div>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%; /* 確保在 Grid 中等高 */
  border-radius: 12px;
  background: white;
  position: relative; /* 用於定位 */
}

/* 懸停效果：整張卡片上浮 */
.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

/* 圖片容器 */
.img-wrapper {
  position: relative;
  aspect-ratio: 1/1;
  background: #f0f0f0;
  overflow: hidden;
}

.img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

/* 懸停效果：圖片放大 */
.product-card:hover .img-wrapper img {
  transform: scale(1.1);
}
.product-card:hover .sold-out-overlay {
  transform: scale(1.1); /* 蓋板也要一起放大才自然 */
}

/* 售完蓋板 (紅色風格) */
.sold-out-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: transform 0.5s ease;
}

.sold-out-overlay span {
  padding: 8px 16px;
  border: 3px solid #e17055;
  color: #e17055;
  font-weight: 900;
  transform: rotate(-15deg);
  background: rgba(255, 255, 255, 0.9);
}

/* 價格標籤 */
.price-tag {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  backdrop-filter: blur(5px);
  font-weight: 600;
  font-size: 0.9rem;
  z-index: 20;
}

/* 資訊區 */
.p-info {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.title {
  font-size: 0.95rem;
  margin-bottom: 12px;
  line-height: 1.4;
  height: 2.8em; /* 限制兩行高度 */
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--text-main);
}

/* 底部操作區 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto; /* 推到底部 */
}

/* 狀態標籤 */
.status-tag {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}
.status-tag.AVAILABLE { background: rgba(6, 199, 85, 0.1); color: var(--primary); }
.status-tag.SOLD_OUT { background: rgba(255, 118, 117, 0.1); color: #d63031; }

/* 預設箭頭按鈕 */
.go-btn {
  width: 24px;
  height: 24px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.product-card:hover .go-btn {
  transform: translateX(3px); /* 懸停時箭頭微微向右 */
}
</style>
