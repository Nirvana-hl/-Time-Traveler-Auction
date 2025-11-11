<template>
  <div class="auction-panel">
    <div class="auction-header">
      <div class="auction-title-section">
        <h3 class="auction-title">🏺 时空拍卖会</h3>
        <p class="auction-subtitle">竞拍来自不同时空的珍贵奇物</p>
      </div>
      <div class="header-right" v-if="auctionsList.length > 0">
        <div class="energy-badge" v-if="currentPlayerInfo">
          <span class="icon">⚡</span>
          <span class="label">能量</span>
          <span class="value">{{ currentPlayerInfo.energy }}</span>
        </div>
        <div class="round-badge-mini">
          <span class="mini-label">回合</span>
          <span class="mini-value">{{ roundCurrent }} / {{ roundTotal }}</span>
        </div>
        <div class="countdown">
          <div class="countdown-icon">⏰</div>
          <span class="countdown-text">{{ countdown }}s</span>
        </div>
      </div>
    </div>
    
    <div class="auction-content" v-if="auctionsList.length > 0">
      <!-- 主拍品展示（取第一件） -->
      <div class="auction-item" v-if="false">
        <div class="artifact-card">
          <div class="artifact-image-container">
            <img class="auction-image" src="https://via.placeholder.com/120x120?text=拍品" alt="拍卖品" />
            <div class="artifact-glow"></div>
          </div>
          <div class="artifact-info">
            <h4 class="artifact-name">拍品</h4>
            <p class="artifact-era">--</p>
            <div class="artifact-tags">
              <span class="artifact-tag">--</span>
            </div>
          </div>

        </div>
      </div>

      <!-- 其他同时进行的拍品（列表卡片） -->
      <div class="auction-list" v-if="auctionsList.length > 0">
        <div class="auction-card" v-for="(a, idx) in auctionsList" :key="a.id">
          <div class="artifact-card">
            <div class="artifact-image-container">
              <img class="auction-image" :src="a.artifact.image" alt="拍卖品" @click="$emit('artifact-click', a.artifact)" />
            </div>
            <div class="artifact-info">
              <h4 class="artifact-name" :title="a.artifact.name">{{ a.artifact.name }}</h4>
              <p class="artifact-era" :title="a.artifact.era">{{ a.artifact.era }}</p>
              <div class="artifact-tags">
                <span v-for="tag in (a.artifact.collectionTags || []).slice(0, 3)" :key="tag" class="artifact-tag" :title="tag">{{ tag }}</span>
                <span v-if="(a.artifact.collectionTags || []).length > 3" class="artifact-tag more-tag">+{{ (a.artifact.collectionTags || []).length - 3 }}</span>
              </div>
            </div>
          </div>
          <div class="bid-display">
            <span class="bid-amount">{{ a.highestBid }}</span>
            <span class="bid-unit">能量</span>
            <div class="bidder-info" v-if="a.highestBidder">
              <img class="bidder-avatar" :src="getBidderAvatar(a.highestBidder)" :alt="getBidderName(a.highestBidder)" />
              <span class="bidder-name">{{ getBidderName(a.highestBidder) }}</span>
            </div>

          </div>
          <!-- 倒计时进度条（统一倒计时，只用 sharedCountdown 计算百分比） -->
          <div class="countdown-progress" v-if="auctionsList.length > 0">
            <div 
              class="progress-fill"
              :style="{ width: getCountdownPercentShared() + '%' }"
            ></div>
          </div>
          <div class="bid-input">
            <div class="bid-input-group">
              <input 
                class="bid-field" 
                type="text" 
                inputmode="numeric"
                pattern="\\d*"
                v-model="bidAmounts[a.id]" 
                @input="onBidInput(a.id)"
                @keydown.enter="placeBid(a)"
              />
              <span class="bid-unit-label">能量</span>
            </div>
            <button 
              class="bid-button" 
              @click="placeBid(a)"
              :disabled="!(parseInt(bidAmounts[a.id]||0) > a.highestBid && parseInt(bidAmounts[a.id]||0) <= (currentPlayerInfo ? currentPlayerInfo.energy : 0) && a.status === 'active')"
            >
              <span class="bid-icon">🎯</span>
              出价
            </button>
          </div>

        </div>
      </div>
      

      
    </div>
    
    <div class="no-auction" v-else>
      <div class="no-auction-content">
        <div class="no-auction-icon">🏺</div>
        <p class="no-auction-text">当前没有活跃的拍卖</p>
        <p class="no-auction-subtitle">等待下一件奇物出现...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'AuctionPanel',
  props: {
    currentAuction: { type: Object, default: null },
    auctions: { type: Array, default: () => [] },
    countdown: { type: Number, default: 0 },
    // 新增：回合显示由父组件传入，与拍卖会同框展示
    roundCurrent: { type: Number, default: 0 },
    roundTotal: { type: Number, default: 4 }
  },
  data() {
    return {
      bidAmounts: {}
    }
  },
  computed: {
    ...mapState(['players']),
    ...mapGetters(['currentPlayerInfo']),
    auctionsList() {
      if (this.auctions && this.auctions.length) return this.auctions
      return this.currentAuction ? [this.currentAuction] : []
    },
    // 使用父组件统一传入的倒计时
    __dummy() { return null }
  },
  watch: {
    countdown(newVal) {
      // 改为只显示，不在子组件触发结算，避免重复结算
    }
  },
  methods: {
    canBid(a) {
      const amount = parseInt(this.bidAmounts[a.id] || 0)
      return a && a.status === 'active' && this.currentPlayerInfo && this.currentPlayerInfo.energy >= amount
    },
    getCountdownPercentShared() {
      // 使用父组件传入的统一倒计时（剩余秒数）来计算进度；总时长默认30秒
      const total = 30
      const remain = Number(this.countdown) || 0
      if (total <= 0) return 0
      const percent = ((total - remain) / total) * 100
      return Math.max(0, Math.min(100, Math.round(percent)))
    },
    onBidInput(auctionId) {
      // 仅保留数字，移除非数字字符；避免小程序等平台对 number 的限制导致无法输入
      const raw = String(this.bidAmounts[auctionId] || '')
      const cleaned = raw.replace(/[^\d]/g, '')
      this.$set(this.bidAmounts, auctionId, cleaned)
    },
    async placeBid(a) {
      const amount = parseInt(this.bidAmounts[a.id] || 0)
      if (!Number.isFinite(amount) || amount <= 0) { alert('请输入有效的数字'); return }
      if (amount > (this.currentPlayerInfo ? this.currentPlayerInfo.energy : 0)) { alert('能量不足'); return }
      if (amount <= a.highestBid) { alert('出价必须高于当前最高价'); return }
      if (!a || a.status !== 'active') { alert('当前拍卖不可出价'); return }
      try {
        await this.$store.dispatch('placeBid', {
          auctionId: a.id,
          playerId: this.currentPlayerInfo.id,
          playerName: this.currentPlayerInfo.name,
          bidAmount: amount
        })
        this.$store.commit('SET_PLAYER_ENERGY', this.currentPlayerInfo.energy - amount)
        this.$set(this.bidAmounts, a.id, '')
        alert('出价成功')
      } catch (error) {
        alert(error.message || '出价失败')
      }
    },
    
    getBidderName(playerId) {
      // 优先使用父组件提供的名称解析（基于 profiles/room 更准确）
      if (this.$parent && typeof this.$parent.getNameFor === 'function') {
        const name = this.$parent.getNameFor(playerId)
        if (name && typeof name === 'string') return name
      }
      // 其次回退到本地 players（旧结构）
      const player = Array.isArray(this.players) ? this.players.find(p => p.id === playerId) : null
      if (player && player.name) return player.name
      // 最后回退为ID前缀，避免“未知玩家”
      return (playerId || '').slice(0, 6) || '玩家'
    },
    
    getBidderAvatar(playerId) {
      // 从父组件获取头像信息
      if (this.$parent && this.$parent.getAvatarFor) {
        return this.$parent.getAvatarFor(playerId)
      }
      // 默认头像
      const code = (playerId || 'U').slice(0, 2).toUpperCase()
      const bg = '334155'
      const fg = 'e2e8f0'
      const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='100%' height='100%' fill='#${bg}'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='#${fg}' font-family='Arial, sans-serif'>${code}</text></svg>`)
      return `data:image/svg+xml;charset=utf-8,${svg}`
    }
  }
}
</script>

<style scoped>
.auction-panel {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: 1px solid #334155;
  border-radius: 20px;
  padding: 24px;
  margin: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.auction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #334155;
}
.header-right { display:flex; align-items:center; gap: 12px; }
.energy-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:12px; background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15)); border:1px solid rgba(59,130,246,0.35); }
.energy-badge .icon { font-size: 14px; }
.energy-badge .label { font-size: 12px; color:#94a3b8; }
.energy-badge .value { font-size: 14px; font-weight: 700; color:#e2e8f0; }
.round-badge-mini { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:12px; background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15)); border:1px solid rgba(59,130,246,0.35); }
.round-badge-mini .mini-label { font-size: 12px; color:#94a3b8; }
.round-badge-mini .mini-value { font-size: 14px; font-weight: 700; color:#e2e8f0; }

.auction-title-section {
  flex: 1;
}

.auction-title {
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 4px 0;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auction-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.countdown {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.countdown-icon {
  font-size: 16px;
}

.countdown-text {
  font-size: 16px;
  font-weight: 700;
}

.auction-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  /* 当拍卖卡片很多时，使用内部滚动，不拉长页面 */
  overflow-y: auto;
  max-height: 58vh; /* 留出顶部区域空间 */
  padding-right: 0px; /* 给滚动条留出一点空间，避免遮挡内容 */
  -webkit-overflow-scrolling: touch;
  /* Firefox 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
}
@media (max-width: 1200px) {
  .auction-list { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .auction-list { grid-template-columns: 1fr; }
}

/* WebKit 自定义滚动条（Chromium / Safari） */
.auction-list::-webkit-scrollbar {
  width: 8px;
}
.auction-list::-webkit-scrollbar-track {
  background: transparent;
}
.auction-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(59,130,246,0.35), rgba(139,92,246,0.35));
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.auction-list:hover::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(59,130,246,0.55), rgba(139,92,246,0.55));
}
.auction-card {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 16px;
}
.auction-card-header { display:flex; justify-content:flex-end; }
.auction-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  /* 固定拍卖内容可视高度，内部滚动，避免整页拉长 */
  max-height: 60vh;
}
.player-energy { color:#e2e8f0; font-weight:600; }
.auction-item {
  margin-bottom: 0;
}

.artifact-card {
  background: linear-gradient(135deg, #1f2937, #374151);
  border: 1px solid #4b5563;
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

.artifact-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  opacity: 0.5;
}

.artifact-image-container {
  position: relative;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0b1220;
  border-radius: 12px;
}

.auction-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 10px;
  border: 2px solid #4b5563;
  position: relative;
  z-index: 1;
}

.artifact-glow {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  border-radius: 16px;
  opacity: 0.3;
  z-index: 0;
}

.artifact-info {
  position: relative;
  z-index: 1;
  min-width: 0; /* 使子元素 ellipsis 生效 */
}

.artifact-name {
  font-size: 18px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artifact-era {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artifact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 44px;
  overflow: hidden;
}

.artifact-tag {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.more-tag { background: #475569; }

.current-bid {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  padding: 20px;
}

.bid-header {
  margin-bottom: 12px;
}

.bid-label {
  font-size: 16px;
  font-weight: 600;
  color: #10b981;
}

.bid-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bid-amount {
  font-size: 28px;
  font-weight: 700;
  color: #10b981;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.bid-unit {
  font-size: 16px;
  color: #94a3b8;
  font-weight: 500;
}

.bidder-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bidder-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #4b5563;
}

.bidder-name {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.bid-input {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap; /* 避免窄宽时与按钮重叠 */
}

.bid-input-group {
  /* 自适应，不超出卡片可用宽度 */
  flex: 1 1 180px;
  max-width: 100%;
  position: relative;
}
@media (min-width: 1280px) {
  .bid-input-group { flex-basis: 220px; }
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 14px;
  pointer-events: none;
}

.bid-field {
  width: 100%;
  height: 48px;
  background: #0b1220;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 0 16px 0 32px;
  box-sizing: border-box; /* 确保边框与内边距不导致超宽 */
  color: #e2e8f0;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
}

.bid-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.bid-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bid-unit-label {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 14px;
  pointer-events: none;
}

.bid-button {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0 24px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.bid-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

.bid-button:disabled {
  background: #6b7280;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.bid-icon {
  font-size: 18px;
}


.no-auction {
  text-align: center;
  padding: 60px 20px;
}

.no-auction-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.no-auction-icon {
  font-size: 48px;
  opacity: 0.5;
}

.no-auction-text {
  font-size: 18px;
  color: #94a3b8;
  margin: 0;
  font-weight: 600;
}

.no-auction-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}
</style>