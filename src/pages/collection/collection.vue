<template>
  <view class="collection-page">
    <view class="page-header">
      <text class="page-title">收藏集</text>
      <view class="player-info">
        <text class="player-name">{{ currentPlayer.name }}</text>
        <text class="completion-rate">完成度: {{ completionRate }}%</text>
      </view>
    </view>

    <!-- 收藏集列表 -->
    <view class="collections-list">
      <view 
        v-for="collection in collections" 
        :key="collection.id"
        class="collection-card"
        :class="{ completed: isCollectionCompleted(collection) }"
      >
        <image 
          class="collection-icon" 
          :src="collection.icon" 
          mode="aspectFit"
        />
        <view class="collection-info">
          <text class="collection-name">{{ collection.name }}</text>
          <text class="collection-description">{{ collection.description }}</text>
          <view class="collection-progress">
            <view class="progress-bar">
              <view 
                class="progress-fill"
                :style="{ width: getProgressWidth(collection) }"
              ></view>
            </view>
            <text class="progress-text">
              {{ getCurrentCount(collection) }}/{{ collection.requiredCount }}
            </text>
          </view>
          <view class="collection-reward">
            <text class="reward-label">奖励:</text>
            <text class="reward-points">{{ collection.rewardPoints }} 分</text>
            <text 
              class="reward-status"
              v-if="isCollectionCompleted(collection)"
            >
              已完成 ✓
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 我的奇物 -->
    <view class="my-artifacts">
      <text class="section-title">我的奇物 ({{ playerArtifacts.length }})</text>
      <view class="artifacts-grid">
        <view 
          v-for="artifact in playerArtifacts" 
          :key="artifact.id"
          class="artifact-card"
          @click="showArtifactDetail(artifact)"
        >
          <image 
            class="artifact-image" 
            :src="artifact.image" 
            mode="aspectFit"
          />
          <view class="artifact-info">
            <text class="artifact-name">{{ artifact.name }}</text>
            <text class="artifact-era">{{ artifact.era }}</text>
            <view class="artifact-tags">
              <text 
                v-for="tag in artifact.collectionTags" 
                :key="tag"
                class="artifact-tag"
              >
                {{ tag }}
              </text>
            </view>
            <text class="artifact-value">价值: {{ artifact.baseValue }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 奇物详情弹窗 -->
    <uni-popup ref="artifactDetailPopup" type="center">
      <view class="artifact-detail-popup" v-if="selectedArtifact">
        <image 
          class="detail-image" 
          :src="selectedArtifact.image" 
          mode="aspectFit"
        />
        <view class="detail-content">
          <text class="detail-name">{{ selectedArtifact.name }}</text>
          <text class="detail-era">{{ selectedArtifact.era }} - {{ selectedArtifact.location }}</text>
          <text class="detail-story">{{ selectedArtifact.story }}</text>
          <view class="detail-tags">
            <text 
              v-for="tag in selectedArtifact.collectionTags" 
              :key="tag"
              class="detail-tag"
            >
              {{ tag }}
            </text>
          </view>
          <text class="detail-value">基础价值: {{ selectedArtifact.baseValue }}</text>
        </view>
        <button class="close-button" @click="hideArtifactDetail">关闭</button>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'CollectionPage',
  data() {
    return {
      collections: [],
      playerArtifacts: [],
      selectedArtifact: null
    }
  },
  computed: {
    ...mapState(['currentPlayer']),
    
    completionRate() {
      if (this.collections.length === 0) return 0
      const completedCount = this.collections.filter(collection => 
        this.isCollectionCompleted(collection)
      ).length
      return Math.round((completedCount / this.collections.length) * 100)
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      await this.loadCollections()
      await this.loadPlayerArtifacts()
    },
    
    async loadCollections() {
      try {
        const response = await uni.request({
          url: '/static/data/collections.json'
        })
        this.collections = response.data
      } catch (error) {
        console.error('加载收藏集数据失败:', error)
      }
    },
    
    async loadPlayerArtifacts() {
      if (this.currentPlayer && this.currentPlayer.artifacts) {
        try {
          const response = await uni.request({
            url: '/static/data/artifacts.json'
          })
          const allArtifacts = response.data
          this.playerArtifacts = allArtifacts.filter(artifact => 
            this.currentPlayer.artifacts.includes(artifact.id)
          )
        } catch (error) {
          console.error('加载奇物数据失败:', error)
        }
      }
    },
    
    isCollectionCompleted(collection) {
      const currentCount = this.getCurrentCount(collection)
      return currentCount >= collection.requiredCount
    },
    
    getCurrentCount(collection) {
      if (!this.currentPlayer || !this.currentPlayer.collections) return 0
      return this.currentPlayer.collections[collection.name] || 0
    },
    
    getProgressWidth(collection) {
      const currentCount = this.getCurrentCount(collection)
      const percentage = Math.min((currentCount / collection.requiredCount) * 100, 100)
      return `${percentage}%`
    },
    
    showArtifactDetail(artifact) {
      this.selectedArtifact = artifact
      this.$refs.artifactDetailPopup.open()
    },
    
    hideArtifactDetail() {
      this.$refs.artifactDetailPopup.close()
      this.selectedArtifact = null
    }
  }
}
</script>

<style scoped>
.collection-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  background: #fff;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.player-name {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.completion-rate {
  font-size: 16px;
  font-weight: bold;
  color: #4caf50;
}

.collections-list {
  padding: 16px;
}

.collection-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.collection-card.completed {
  background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
  border: 2px solid #4caf50;
}

.collection-icon {
  width: 60px;
  height: 60px;
  margin-right: 16px;
}

.collection-info {
  flex: 1;
}

.collection-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.collection-description {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 12px;
}

.collection-progress {
  margin-bottom: 12px;
}

.progress-bar {
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

.collection-reward {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reward-label {
  font-size: 12px;
  color: #666;
}

.reward-points {
  font-size: 14px;
  color: #ff9800;
  font-weight: bold;
}

.reward-status {
  font-size: 12px;
  color: #4caf50;
  font-weight: bold;
}

.my-artifacts {
  background: #fff;
  margin: 16px;
  border-radius: 12px;
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.artifacts-grid {
  display: flex;
  flex-direction: column;
}

.artifact-card {
  display: flex;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.artifact-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  margin-right: 12px;
}

.artifact-info {
  flex: 1;
}

.artifact-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.artifact-era {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 8px;
}

.artifact-tags {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.artifact-tag {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-right: 4px;
  margin-bottom: 4px;
}

.artifact-value {
  font-size: 14px;
  color: #ff9800;
  font-weight: bold;
}

.artifact-detail-popup {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 80vw;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-image {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.detail-content {
  margin-bottom: 16px;
}

.detail-name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8px;
}

.detail-era {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 12px;
}

.detail-story {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  display: block;
  margin-bottom: 12px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.detail-tag {
  background: #e3f2fd;
  color: #1976d2;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  margin-right: 8px;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 16px;
  color: #ff9800;
  font-weight: bold;
}

.close-button {
  background: #666;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  width: 100%;
}
</style>
