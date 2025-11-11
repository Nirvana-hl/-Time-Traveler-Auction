<template>
  <div class="collection-page">
    <div class="page-header">
      <h2 class="page-title">收藏集</h2>
      <div class="player-info">
        <span class="player-name">{{ currentPlayer ? currentPlayer.name : '未知玩家' }}</span>
        <span class="completion-rate">完成度: {{ completionRate }}%</span>
      </div>
    </div>

    <!-- 收藏集列表 -->
    <div class="collections-list">
      <div 
        v-for="collection in collections" 
        :key="collection.id"
        class="collection-card"
        :class="{ completed: isCollectionCompleted(collection) }"
      >
        <div class="collection-icon">🏆</div>
        <div class="collection-info">
          <h3 class="collection-name">{{ collection.name }}</h3>
          <p class="collection-description">{{ collection.description }}</p>
          <div class="collection-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill"
                :style="{ width: getProgressWidth(collection) }"
              ></div>
            </div>
            <span class="progress-text">
              {{ getCurrentCount(collection) }}/{{ collection.requiredCount }}
            </span>
          </div>
          <div class="collection-reward">
            <span class="reward-label">奖励:</span>
            <span class="reward-points">{{ collection.rewardPoints }} 分</span>
            <span 
              class="reward-status"
              v-if="isCollectionCompleted(collection)"
            >
              已完成 ✓
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的奇物 -->
    <div class="my-artifacts">
      <h3 class="section-title">我的奇物 ({{ playerArtifacts.length }})</h3>
      <div class="artifacts-grid">
        <div 
          v-for="artifact in playerArtifacts" 
          :key="artifact.id"
          class="artifact-card"
          @click="showArtifactDetail(artifact)"
        >
          <img 
            class="artifact-image" 
            :src="artifact.image" 
            alt="奇物图片"
          />
          <div class="artifact-info">
            <h4 class="artifact-name">{{ artifact.name }}</h4>
            <p class="artifact-era">{{ artifact.era }}</p>
            <div class="artifact-tags">
              <span 
                v-for="tag in artifact.collectionTags" 
                :key="tag"
                class="artifact-tag"
              >
                {{ tag }}
              </span>
            </div>
            <span class="artifact-value">价值: {{ artifact.baseValue }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 奇物详情弹窗 -->
    <div v-if="selectedArtifact" class="artifact-detail-popup">
      <div class="popup-overlay" @click="hideArtifactDetail"></div>
      <div class="popup-content">
        <img 
          class="detail-image" 
          :src="selectedArtifact.image" 
          alt="奇物图片"
        />
        <div class="detail-content">
          <h3 class="detail-name">{{ selectedArtifact.name }}</h3>
          <p class="detail-era">{{ selectedArtifact.era }} - {{ selectedArtifact.location }}</p>
          <p class="detail-story">{{ selectedArtifact.story }}</p>
          <div class="detail-tags">
            <span 
              v-for="tag in selectedArtifact.collectionTags" 
              :key="tag"
              class="detail-tag"
            >
              {{ tag }}
            </span>
          </div>
          <p class="detail-value">基础价值: {{ selectedArtifact.baseValue }}</p>
        </div>
        <button class="close-button" @click="hideArtifactDetail">关闭</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { loadCollectionsFromArtifacts, getCurrentCollectionCount, getCollectionProgress } from '../../features/game/collections.utils'
import { loadArtifacts as loadArtifactsService } from '../../features/game/artifacts.service'
import { getSupabase } from '../../services/supabase-client'

export default {
  name: 'CollectionPage',
  data() {
    return {
      collections: [],
      playerArtifacts: [],
      selectedArtifact: null,
      artifactMap: {}
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
        // 加载所有奇物数据
        const artifacts = await loadArtifactsService({ supabase: getSupabase() })
        this.artifactMap = artifacts.reduce((acc, a) => { acc[a.id] = a; return acc }, {})
        // 使用动态生成收藏集，与 index.vue 保持一致
        this.collections = loadCollectionsFromArtifacts(this.artifactMap)
      } catch (error) {
        console.error('加载收藏集数据失败:', error)
        this.collections = []
      }
    },
    
    async loadPlayerArtifacts() {
      if (this.currentPlayer && this.currentPlayer.artifacts) {
        try {
          // 使用已加载的 artifactMap
          this.playerArtifacts = (this.currentPlayer.artifacts || [])
            .map(aid => this.artifactMap[aid])
            .filter(Boolean)
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
      // 统一使用 collections.utils.js 的计算逻辑
      const ownedArtifactIds = (this.currentPlayer && this.currentPlayer.artifacts) ? this.currentPlayer.artifacts : []
      return getCurrentCollectionCount({
        artifactMap: this.artifactMap,
        ownedArtifactIds: ownedArtifactIds,
        collection: collection
      })
    },
    
    getProgressWidth(collection) {
      // 统一使用 collections.utils.js 的进度计算
      const currentCount = this.getCurrentCount(collection)
      const progress = getCollectionProgress({
        current: currentCount,
        required: collection.requiredCount
      })
      return `${progress}%`
    },
    
    showArtifactDetail(artifact) {
      this.selectedArtifact = artifact
    },
    
    hideArtifactDetail() {
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
  margin: 0;
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
  margin: 0 0 4px 0;
}

.collection-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
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
  margin: 0 0 12px 0;
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
  margin: 0 0 4px 0;
}

.artifact-era {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px 0;
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.popup-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.popup-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
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
  margin: 0 0 8px 0;
}

.detail-era {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
}

.detail-story {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin: 0 0 12px 0;
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
