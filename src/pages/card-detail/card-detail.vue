<template>
  <view class="card-detail-page">
    <view class="detail-header">
      <button class="back-button" @click="goBack">← 返回</button>
      <text class="page-title">奇物详情</text>
    </view>

    <view class="card-content" v-if="artifact">
      <!-- 奇物图片 -->
      <view class="artifact-image-section">
        <image 
          class="artifact-image" 
          :src="artifact.image" 
          mode="aspectFit"
          @error="onImageError"
        />
      </view>

      <!-- 基本信息 -->
      <view class="artifact-info">
        <text class="artifact-name">{{ artifact.name }}</text>
        <text class="artifact-era">{{ artifact.era }}</text>
        <text class="artifact-location">{{ artifact.location }}</text>
        
        <!-- 收藏集标签 -->
        <view class="artifact-tags">
          <text 
            v-for="tag in artifact.collectionTags" 
            :key="tag"
            class="artifact-tag"
          >
            {{ tag }}
          </text>
        </view>

        <!-- 基础价值 -->
        <view class="artifact-value">
          <text class="value-label">基础价值:</text>
          <text class="value-number">{{ artifact.baseValue }}</text>
        </view>
      </view>

      <!-- 背景故事 -->
      <view class="artifact-story">
        <text class="story-title">背景故事</text>
        <text class="story-content">{{ artifact.story }}</text>
      </view>

      <!-- 相关收藏集 -->
      <view class="related-collections">
        <text class="collections-title">相关收藏集</text>
        <view class="collections-list">
          <view 
            v-for="tag in artifact.collectionTags" 
            :key="tag"
            class="collection-item"
          >
            <text class="collection-name">{{ tag }}</text>
            <text class="collection-progress">
              {{ getCollectionProgress(tag) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view class="loading" v-else>
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'CardDetailPage',
  data() {
    return {
      artifact: null
    }
  },
  computed: {
    ...mapState(['currentPlayer'])
  },
  async mounted() {
    await this.loadArtifact()
  },
  methods: {
    async loadArtifact() {
      const artifactId = this.$route.query.id
      if (!artifactId) {
        uni.showToast({
          title: '奇物ID不存在',
          icon: 'none'
        })
        this.goBack()
        return
      }

      try {
        const response = await uni.request({
          url: '/static/data/artifacts.json'
        })
        const artifacts = response.data
        this.artifact = artifacts.find(artifact => artifact.id === artifactId)
        
        if (!this.artifact) {
          uni.showToast({
            title: '奇物不存在',
            icon: 'none'
          })
          this.goBack()
        }
      } catch (error) {
        console.error('加载奇物详情失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.goBack()
      }
    },
    
    onImageError() {
      console.error('奇物图片加载失败:', this.artifact.image)
      // 可以设置默认图片
      this.artifact.image = '/static/images/placeholder.jpg'
    },
    
    getCollectionProgress(tag) {
      if (!this.currentPlayer || !this.currentPlayer.collections) {
        return '0/未知'
      }
      
      const currentCount = this.currentPlayer.collections[tag] || 0
      const requiredCount = this.getRequiredCount(tag)
      return `${currentCount}/${requiredCount}`
    },
    
    getRequiredCount(tag) {
      const requirements = {
        '艺术瑰宝': 3,
        '科技奇点': 2,
        '生命奥秘': 3,
        '权力象征': 2
      }
      return requirements[tag] || 0
    },
    
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style scoped>
.card-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.detail-header {
  background: #fff;
  padding: 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.back-button {
  background: none;
  border: none;
  color: #4caf50;
  font-size: 16px;
  margin-right: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.card-content {
  padding: 16px;
}

.artifact-image-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.artifact-image {
  width: 100%;
  max-width: 300px;
  height: 300px;
  border-radius: 8px;
}

.artifact-info {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.artifact-name {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8px;
}

.artifact-era {
  font-size: 16px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}

.artifact-location {
  font-size: 14px;
  color: #999;
  display: block;
  margin-bottom: 16px;
}

.artifact-tags {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.artifact-tag {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 16px;
  margin-right: 8px;
  margin-bottom: 8px;
}

.artifact-value {
  display: flex;
  align-items: center;
  background: #fff3e0;
  padding: 12px;
  border-radius: 8px;
}

.value-label {
  font-size: 14px;
  color: #666;
  margin-right: 8px;
}

.value-number {
  font-size: 20px;
  font-weight: bold;
  color: #ff9800;
}

.artifact-story {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.story-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.story-content {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
}

.related-collections {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.collections-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.collections-list {
  display: flex;
  flex-direction: column;
}

.collection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.collection-item:last-child {
  border-bottom: none;
}

.collection-name {
  font-size: 14px;
  color: #333;
}

.collection-progress {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 12px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #666;
}
</style>
