<template>
  <div class="player-page">
    <div class="header">
      <button class="back" @click="$router.back()">← 返回</button>
      <h2 class="title">玩家：{{ player ? player.name : '未知' }}</h2>
    </div>

    <div class="stats" v-if="player">
      <div class="stat">能量：{{ player.energy }}</div>
      <div class="stat">奇物：{{ player.artifacts.length }}</div>
      <div class="stat">道具：{{ player.items.length }}</div>
    </div>

    <div class="hand-section" v-if="player">
      <h3 class="section-title">手牌</h3>
      <div class="hand-grid">
        <div v-for="aid in player.artifacts" :key="aid" class="hand-card">
          <img class="hand-image" :src="artifactMap[aid] ? artifactMap[aid].image : 'https://via.placeholder.com/200x120?text=未知卡牌'" />
          <div class="hand-name">{{ artifactMap[aid] ? artifactMap[aid].name : aid }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PlayerPage',
  data() {
    return {
      player: null,
      artifactMap: {}
    }
  },
  async mounted() {
    const id = this.$route.params.id
    const player = this.$store.state.players.find(p => p.id === id) || null
    this.player = player
    const artifacts = await this.loadArtifacts()
    this.artifactMap = artifacts.reduce((acc, a) => { acc[a.id] = a; return acc }, {})
  },
  methods: {
    async loadArtifacts() {
      try {
        return [
          { id: 'artifact_001', name: '唐代秘色瓷', image: 'https://via.placeholder.com/300x200?text=唐代秘色瓷' },
          { id: 'artifact_002', name: '达芬奇设计图', image: 'https://via.placeholder.com/300x200?text=达芬奇设计图' }
        ]
      } catch (e) { return [] }
    }
  }
}
</script>

<style scoped>
.player-page { min-height: 100vh; padding: 16px; }
.header { display:flex; align-items:center; gap:8px; }
.back { background:#334155; color:#fff; border-radius:8px; padding:6px 10px; }
.title { color:#e2e8f0; }
.stats { display:flex; gap:12px; margin:12px 0; color:#e2e8f0; }
.section-title { color:#e2e8f0; margin-bottom:8px; }
.hand-grid { display:flex; flex-wrap:wrap; gap:8px; }
.hand-card { width:200px; background: #0f172a; border:1px solid #1f2937; border-radius:12px; overflow:hidden; }
.hand-image { width:100%; height:120px; object-fit:cover; }
.hand-name { font-size:13px; color:#e2e8f0; padding:6px 8px; }
</style>
