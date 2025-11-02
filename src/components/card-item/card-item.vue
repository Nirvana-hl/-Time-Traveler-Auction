<template>
  <view class="card-item" @click="onCardClick">
    <image 
      class="card-image" 
      :src="card.image" 
      mode="aspectFit"
      @error="onImageError"
    />
    <view class="card-info">
      <text class="card-name">{{ card.name }}</text>
      <text class="card-era">{{ card.era }}</text>
      <view class="card-tags">
        <text 
          v-for="tag in card.collectionTags" 
          :key="tag" 
          class="card-tag"
        >
          {{ tag }}
        </text>
      </view>
      <text class="card-value">价值: {{ card.baseValue }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CardItem',
  props: {
    card: {
      type: Object,
      required: true
    },
    clickable: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    onCardClick() {
      if (this.clickable) {
        this.$emit('card-click', this.card)
      }
    },
    onImageError() {
      console.error('卡牌图片加载失败:', this.card.image)
    }
  }
}
</script>

<style scoped>
.card-item {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;
}

.card-item:active {
  transform: scale(0.98);
}

.card-image {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
}

.card-info {
  padding: 12px;
}

.card-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.card-era {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.card-tag {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-right: 4px;
  margin-bottom: 4px;
}

.card-value {
  font-size: 14px;
  color: #ff9800;
  font-weight: bold;
}
</style>
