<template>
  <div class="player-panel">
    <div class="player-header">
      <div class="player-info" @click="$router.push(`/player/${player.id}`)">
        <img class="avatar" src="https://via.placeholder.com/40x40?text=P" alt="avatar" />
        <span class="player-name">{{ player.name }}</span>
      </div>
      <div class="player-energy">
        <span class="energy-icon">⚡</span>
        <span class="energy-value">{{ player.energy }}</span>
      </div>
    </div>
    <div class="panel-actions">
      <button class="hand-button" @click="$emit('show-hand', player)">查看手牌</button>
    </div>
    
    <div class="player-stats">
      <div class="stat-item">
        <span class="stat-label">奇物数量</span>
        <span class="stat-value">{{ player.artifacts.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">道具数量</span>
        <span class="stat-value">{{ player.items.length }}</span>
      </div>
    </div>
    
    <!-- 拥有的奇物 -->
    <div class="player-artifacts" v-if="player.artifacts.length > 0">
      <h4 class="artifacts-title">我的奇物</h4>
      <div class="artifacts-grid">
        <div 
          v-for="artifactId in player.artifacts" 
          :key="artifactId"
          class="artifact-item"
          @click="showArtifactDetail(artifactId)"
        >
          <span class="artifact-name">{{ getArtifactName(artifactId) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerPanel',
  props: {
    player: {
      type: Object,
      required: true
    }
  },
  methods: {
    getArtifactName(artifactId) {
      // 这里应该从store或服务中获取奇物名称
      // 暂时返回ID
      return artifactId
    },
    
    showArtifactDetail(artifactId) {
      // 显示奇物详情
      this.$emit('show-artifact-detail', artifactId)
    }
  }
}
</script>

<style scoped>
.player-panel {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.player-info { display:flex; align-items:center; gap:8px; cursor:pointer; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.panel-actions { display:flex; justify-content:flex-end; margin-bottom: 8px; }
.hand-button { background:#3b82f6; color:#fff; border-radius:8px; padding:6px 10px; }


.player-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.player-energy {
  display: flex;
  align-items: center;
  background: #fff3e0;
  padding: 4px 12px;
  border-radius: 16px;
}

.energy-icon {
  font-size: 16px;
  margin-right: 4px;
}

.energy-value {
  font-size: 16px;
  font-weight: bold;
  color: #ff9800;
}

.player-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.player-artifacts {
  border-top: 1px solid #eee;
  padding-top: 16px;
}

.artifacts-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.artifacts-grid {
  display: flex;
  flex-wrap: wrap;
}

.artifact-item {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 12px;
  margin: 2px;
  font-size: 12px;
  cursor: pointer;
}

.artifact-item:hover {
  background: #bbdefb;
}
</style>