<template>
  <div class="game-container" :class="{ 'post-start': gamePhase !== 'preparation' }">
    <!-- 游戏状态栏 -->
    <div class="top-auth-bar">
      <div class="left">
        <span class="brand">时空旅人拍卖会</span>
      </div>
      <div class="right" v-if="user">
        <span class="user-email">{{ user.email }}</span>
        <button class="nav-button" @click="$router.push('/profile')">个人中心</button>
      </div>
      <div class="right" v-else>
        <button class="nav-button primary" @click="$router.push('/login')">登录 / 注册</button>
      </div>
    </div>

    <div class="game-status">
      <div class="room-info">
        <span class="room-name">{{ room ? (room.name || '未命名房间') : '未加入房间' }}</span>
        <span class="round-info" v-if="gamePhase !== 'preparation'">回合：{{ roundCount }}/{{ totalRounds }}</span>
        <span class="room-id">ID: {{ room ? (room.short_id || room.id) : '-' }}</span>
        <span class="room-meta" v-if="room">玩家 {{ playerCount }}/{{ seatCount }} · 房主：{{ ownerName }}</span>
      </div>
      <span class="game-phase">{{ gamePhaseText }}</span>
       <div class="player-energy-hud" v-if="currentPlayer && gamePhase !== 'countdown' && gamePhase !== 'intermission'">
        <span class="icon">⚡</span>
        <span class="label">能量</span>
        <span class="value">{{ $store.state.playerEnergy }}</span>
      </div>
      <div class="game-controls">
        <button class="control-button" @click="toggleReady" v-if="gamePhase === 'preparation'">{{ currentUserReady ? '取消准备' : '准备' }}</button>
        <button class="control-button" @click="startGame" v-if="gamePhase === 'preparation' && isOwner && allReady">开始游戏</button>
        <button class="control-button" @click="startAuction" v-if="false">开始拍卖</button>
        <button class="control-button" @click="openShop" v-if="gamePhase === 'item'">道具商店</button>
        <button class="control-button danger" @click="leaveRoom">退出房间</button>
      </div>
    </div>

    <!-- 玩家头像（拍卖会上方，可点击查看手牌） -->
    <div class="players-avatars" v-if="playerCount > 0 && gamePhase !== 'preparation'">
      <div class="avatar-item" v-for="p in (room ? room.room_players : [])" :key="p.user_id" @click="showPlayerHand(p)">
        <div class="avatar-wrap">
          <img class="player-avatar" :src="getAvatarFor(p.user_id)" />
          <span class="ready-indicator" :class="{ on: !!p.is_ready }"></span>
        </div>
        <div class="player-name">{{ getNameFor(p.user_id) }}</div>
      </div>
    </div>

    <!-- 拍卖会台（居中） -->
    <div class="auction-stage">
      <!-- 预倒计时阶段（游戏开始后5s预热） -->
      <template v-if="gamePhase === 'countdown'">
        <div class="countdown-stage">
          <div class="countdown-content">
            <div class="countdown-icon">⏳</div>
            <div class="countdown-title">游戏即将开始</div>
            <div class="countdown-timer">{{ auctionCountdown }}s</div>
            <div class="countdown-subtitle">请稍候，拍卖即将开始...</div>
          </div>
        </div>
      </template>
            <!-- 间歇阶段（每轮结束后的休息时间） -->
      <template v-else-if="gamePhase === 'intermission'">
        <div class="countdown-stage">
          <div class="countdown-content">
            <div class="countdown-icon">🧭</div>
            <div class="countdown-title">间歇中</div>
            <div class="countdown-timer">{{ auctionCountdown }}s</div>
            <div class="countdown-subtitle">请稍候，下一轮拍卖即将开始...</div>
          </div>
        </div>
      </template>
      
      <!-- 当 gamePhase 为 'auction' 时显示拍卖面板，包含拍卖物品和倒计时 -->
      <auction-panel 
        v-else-if="gamePhase === 'auction' && $store.state.currentAuctions && $store.state.currentAuctions.length" 
        :auctions="$store.state.currentAuctions" 
        :countdown="auctionCountdown" 
        @artifact-click="showArtifactDetailFromAuction" 
      />
      <!-- 其他情况显示占位提示 -->
      <div v-else class="stage-placeholder">拍卖会台空闲，等待新一轮拍卖</div>
    </div>

    <!-- 房间座位（仅在准备阶段显示） -->
    <div class="seats" v-if="seatCount > 0 && gamePhase === 'preparation'" :style="{ gridTemplateColumns: 'repeat(' + seatCount + ', 1fr)' }">
      <div class="seat" v-for="(seat, idx) in seats" :key="idx" :class="{ occupied: !!seat.player }" @click="moveToSeat(idx)">
        <div class="seat-index">{{ idx + 1 }}/{{ seatCount }}</div>
        <div class="seat-body">
          <div v-if="seat.player" class="seat-player">
            <div class="avatar-wrap">
              <img class="seat-avatar" :src="getAvatarFor(seat.player.user_id)" />
              <span v-if="seat.player.is_ready" class="ready-badge">✓</span>
            </div>
            <div class="seat-name">{{ getNameFor(seat.player.user_id) }}</div>
          </div>
          <div v-else class="seat-empty">空位</div>
        </div>
      </div>
    </div>

    <!-- 当前玩家手牌（拍卖会下方） -->
    <div class="my-hand" v-if="gamePhase !== 'preparation'">
      <h3 class="hand-title">我的手牌</h3>
      <div class="hand-grid">
        <div v-for="(aid, idx) in (currentPlayer ? currentPlayer.artifacts : [])" :key="aid + '-' + idx" class="hand-card" @click="showArtifactDetail(aid)">
          <img class="hand-image" :src="artifactMap[aid] ? artifactMap[aid].image : 'https://via.placeholder.com/160x100?text=未知卡牌'" />
          <div class="hand-name">{{ artifactMap[aid] ? artifactMap[aid].name : aid }}</div>
        </div>
      </div>
    </div>

    <!-- 收藏集进度面板（左侧） -->
    <div class="collections-panel" v-if="gamePhase !== 'preparation'">
      <div class="collections-section">
        <h4 class="collections-title">收藏集进度</h4>
        <div class="collections-list">
          <div 
            v-for="collection in collectionsComputed" 
            :key="collection.id"
            class="collection-progress-item"
            :class="{ completed: collection._current >= collection.requiredCount }"
          >
            <div class="collection-header">
              <div class="collection-icon">🏆</div>
              <div class="collection-info">
                <div class="collection-name">{{ collection.name }}</div>
                <div class="collection-description">{{ collection.description }}</div>
              </div>
              <div class="collection-reward" v-if="collection._current >= collection.requiredCount">
                <span class="reward-badge">✓</span>
              </div>
            </div>
            <div class="progress-container">
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ width: collection._progress + '%' }"
                ></div>
              </div>
              <div class="progress-text">
                {{ collection._current }}/{{ collection.requiredCount }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天面板（右侧） -->
    <div class="chat-panel" v-if="gamePhase !== 'preparation'">
      <div class="chat-header">
        <h4 class="chat-title">房间聊天</h4>
        <div class="chat-status">
          <span class="status-dot"></span>
          <span class="status-text">在线</span>
        </div>
      </div>
      
      <div class="chat-messages" ref="chatContainer">
        <div 
          v-for="message in chatMessages" 
          :key="message.id"
          class="chat-message"
          :class="{ 'own-message': message.userId === (user && user.id) }"
        >
          <div class="message-header">
            <span class="message-username">{{ message.username }}</span>
            <span class="message-time">{{ formatMessageTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>
      
      <div class="chat-input">
        <input 
          v-model="newMessage"
          @keyup.enter="sendMessage"
          placeholder="输入消息..."
          class="message-input"
        />
        <button @click="sendMessage" class="send-button" :disabled="!newMessage.trim()">
          <span class="send-icon">📤</span>
        </button>
      </div>
    </div>

    <!-- 卡牌详情弹窗 -->
    <div v-if="showCardDetail" class="card-detail-popup">
      <div class="popup-overlay" @click="hideCardDetail"></div>
      <div class="popup-content" v-if="selectedCard">
        <img 
          class="detail-image" 
          :src="selectedCard.image" 
          alt="奇物图片"
        />
        <div class="detail-content">
          <h3 class="detail-name">{{ selectedCard.name }}</h3>
          <p class="detail-era">{{ selectedCard.era }} - {{ selectedCard.location }}</p>
          <p class="detail-story">{{ selectedCard.story }}</p>
          <div class="detail-tags">
            <span 
              v-for="tag in selectedCard.collectionTags" 
              :key="tag"
              class="detail-tag"
            >
              {{ tag }}
            </span>
          </div>
          <p class="detail-value">基础价值: {{ selectedCard.baseValue }}</p>
        </div>
        <button class="close-button" @click="hideCardDetail">关闭</button>
      </div>
    </div>

    <!-- 道具商店弹窗 -->
    <div v-if="showShop" class="shop-popup">
      <div class="popup-overlay" @click="closeShop"></div>
      <div class="popup-content">
        <item-shop />
        <button class="close-button" @click="closeShop">关闭商店</button>
      </div>
    </div>

    <!-- 手牌弹窗 -->
    <div v-if="showHandPopup" class="hand-popup">
      <div class="popup-overlay" @click="hideHand"></div>
      <div class="popup-content">
        <h3 class="hand-title">{{ handPlayer ? handPlayer.name + ' 的手牌' : '手牌' }}</h3>
        <div class="hand-grid">
          <div v-for="aid in (handPlayer ? handPlayer.artifacts : [])" :key="aid" class="hand-card">
            <img class="hand-image" :src="artifactMap[aid] ? artifactMap[aid].image : 'https://via.placeholder.com/160x100?text=未知卡牌'" />
            <div class="hand-name">{{ artifactMap[aid] ? artifactMap[aid].name : aid }}</div>
          </div>
        </div>
        <button class="close-button" @click="hideHand">关闭</button>
      </div>
    </div>

    <!-- 游戏结束对话框 -->
    <div v-if="showGameEndDialog" class="game-end-popup">
      <div class="popup-overlay" @click="closeGameEndDialog"></div>
      <div class="popup-content game-end-content">
        <div class="game-end-header">
          <div class="game-end-icon">🏆</div>
          <h2 class="game-end-title">游戏结束</h2>
          <p class="game-end-subtitle">感谢参与时空旅人拍卖会！</p>
        </div>
        
        <div class="game-end-actions">
          <button class="action-button primary" @click="stayInRoom">
            <span class="btn-icon">🏠</span>
            留在房间
          </button>
          <button class="action-button secondary" @click="goToRooms">
            <span class="btn-icon">📋</span>
            返回房间列表
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import AuctionPanel from '../../components/auction-panel/auction-panel.vue'
import PlayerAvatar from '../../components/player-avatar/player-avatar.vue'
import ItemShop from '../../components/item-shop/item-shop.vue'
import roomService from '../../services/room-service'
import { getSupabase } from '../../services/supabase-client'
import auctionService from '../../services/auction-service'

export default {
  name: 'GameIndex',
  components: {
    AuctionPanel,
    PlayerAvatar,
    ItemShop
  },
  data() {
    return {
      selectedCard: null,
      showHandPopup: false,
      handPlayer: null,
      artifactMap: {},
      room: null,
      profileMap: {},
      refreshTimer: null,
      collections: [],
      showGameEndDialog: false,
      auctionCountdown: 0,
      auctionTimer: null,
      currentAuction: null,
      // 回合相关（前端实时显示，房主每轮开拍时广播以保持同步）
      roundCount: 0,
      totalRounds: 6,
      chatMessages: [],
      newMessage: '',
      chatChannel: null
    }
  },
  computed: {
    ...mapState(['gamePhase', 'gameLog', 'showCardDetail', 'showShop', 'user', 'roomId']),
    // 将当前玩家注入到渲染上下文，避免模板引用报错
    currentPlayer() { return this.$store.state.currentPlayer },
    isOwner() { return this.room && this.user && this.room.owner_id === this.user.id },
    allReady() {
      const players = (this.room && this.room.room_players) ? this.room.room_players : []
      return players.length > 0 && players.every(p => !!p.is_ready)
    },
    currentUserReady() {
      const user = this.user
      const players = (this.room && this.room.room_players) ? this.room.room_players : []
      if (!user) return false
      const me = players.find(p => p.user_id === user.id)
      return !!(me && me.is_ready)
    },
    playerCount() {
      return (this.room && this.room.room_players) ? this.room.room_players.length : 0
    },
    ownerName() {
      if (!this.room) return '-'
      return this.getNameFor(this.room.owner_id)
    },
    seatCount() { return (this.room && Number(this.room.max_players)) ? Number(this.room.max_players) : 0 },
    seats() {
      const players = (this.room && this.room.room_players) ? this.room.room_players : []
      const max = this.seatCount
      const seats = Array.from({ length: max }, () => ({ player: null }))
      // 放置已设置座位的玩家
      players.forEach(p => {
        const idx = typeof p.seat_index === 'number' ? p.seat_index : -1
        if (idx >= 0 && idx < max && !seats[idx].player) seats[idx].player = p
      })
      // 将未设置座位的玩家依次放到空位
      players.filter(p => typeof p.seat_index !== 'number' || p.seat_index < 0).forEach(p => {
        const emptyIdx = seats.findIndex(s => !s.player)
        if (emptyIdx >= 0) seats[emptyIdx].player = p
      })
      return seats
    },
    gamePhaseText() {
      const phaseMap = {
        'preparation': '准备阶段',
        'countdown': '预倒计时',
        'intermission': '间歇阶段',
        'auction': '拍卖阶段',
        'item': '道具阶段',
        'settlement': '结算阶段'
      }
      return phaseMap[this.gamePhase] || '未知阶段'
    },

    // 根据当前用户手牌计算收藏集显示数据，带缓存字段，便于模板直接引用
    collectionsComputed() {
      const list = Array.isArray(this.collections) ? this.collections : []
      return list.map(col => {
        const current = this.getCurrentCollectionCount(col)
        const progress = Math.min((current / (col.requiredCount || 1)) * 100, 100)
        return { ...col, _current: current, _progress: progress }
      })
    }
  },
  async mounted() {
    const roomId = this.$route.query.roomId
    if (roomId) this.$store.commit('SET_ROOM_ID', roomId)
    await this.initializeGame()
    await this.loadRoomState()
    await this.subscribeRoomRealtime()
  },
  beforeDestroy() {
    this.unsubscribeRoomRealtime()
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
    if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
    this.$set(this, 'auctionCountdown', 0)
  },
  methods: {
    // 去掉模拟初始化玩家，改为使用房间的实际玩家列表
    async initializeGame() {
      const artifacts = await this.loadArtifacts()
      this.artifactMap = artifacts.reduce((acc, a) => { acc[a.id] = a; return acc }, {})
      await this.loadCollections()
    },
    async subscribeRoomRealtime() {
      try {
        const rid = this.$store.state.roomId
        if (!rid) return
        const supabase = getSupabase()
        // 数据库变更订阅
        this.roomChannel = supabase
          .channel(`room_db_${rid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${rid}` }, async () => { await this.loadRoomState() })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'room_artifacts', filter: `room_id=eq.${rid}` }, async () => { await this.loadRoomState() })
          .on('postgres_changes', { event: 'update', schema: 'public', table: 'rooms', filter: `id=eq.${rid}` }, async () => { await this.loadRoomState() })
          .subscribe()
        // 广播订阅（主动事件通知）
        this.broadcastChannel = supabase
          .channel(`room_cast_${rid}`)
          .on('broadcast', { event: 'seat_change' }, async () => { await this.loadRoomState() })
          .on('broadcast', { event: 'ready_change' }, async () => { await this.loadRoomState() })
          .on('broadcast', { event: 'game_started' }, async (payload) => {
            console.log('[game] received game_started broadcast', payload)
            // 进入预倒计时阶段
            this.$store.commit('SET_GAME_PHASE', 'countdown')
            this.$set(this, 'auctionCountdown', 5)
            // 初始化当前玩家数据
            const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === this.$store.state.user.id)
            if (me) {
              this.$store.commit('SET_CURRENT_PLAYER', {
                id: me.user_id,
                name: this.getNameFor(me.user_id),
                energy: 50,
                artifacts: [],
                items: []
              })
            }
            // 5s预倒计时，结束后自动开始拍卖
            if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
            this.auctionTimer = setInterval(async () => {
              const newValue = this.auctionCountdown - 1
              this.$set(this, 'auctionCountdown', newValue)
              if (this.auctionCountdown <= 0) {
                clearInterval(this.auctionTimer)
                this.auctionTimer = null
                if (this.isOwner) {
                  await this.autoStartAuction()
                }
              }
            }, 1000)
          })
          .on('broadcast', { event: 'auction_started' }, async (payload) => {
            console.log('[game] received auction_started broadcast', payload)
            // 通过数据库同步该房间的活动拍卖，保持所有客户端拍卖台一致
            try {
              const rid = this.$store.state.roomId
              if (rid) {
                const supabase = getSupabase()
                const { data: dbAuctions } = await supabase
                  .from('auctions')
                  .select('*')
                  .eq('status', 'active')
                  .eq('room_id', rid)
                const existingIds = new Set((this.$store.state.currentAuctions || []).map(a => a.id))
                for (const row of (dbAuctions || [])) {
                  if (existingIds.has(row.id)) continue
                  const artifact = row.artifact || this.artifactMap[row.artifact_id] || { id: row.artifact_id, name: row.artifact_id }
                  const auction = {
                    id: row.id,
                    artifact,
                    highestBid: row.highest_bid || 0,
                    highestBidder: row.highest_bidder || null,
                    timeRemaining: typeof row.time_remaining === 'number' ? row.time_remaining : 30,
                    bids: [],
                    startTime: Date.now(),
                    status: 'active',
                    _timer: null
                  }
                  this.$store.commit('ADD_OR_UPDATE_AUCTION', auction)
                }
              }
            } catch (e) { console.warn('[game] sync auctions on broadcast failed', e) }
            // 启动统一拍卖倒计时（例如30秒），结束后统一结算
            const duration = Number(payload.payload.duration) || 30
            this.startAuctionTimer(duration)
          })
          .on('broadcast', { event: 'auction_bid_update' }, async (payload) => {
            try {
              const { auctionId, highestBid, highestBidder } = payload.payload || {}
              if (!auctionId) return
              const list = this.$store.state.currentAuctions || []
              const idx = list.findIndex(a => a.id === auctionId)
              if (idx >= 0) {
                const next = { ...list[idx], highestBid, highestBidder }
                this.$store.commit('ADD_OR_UPDATE_AUCTION', next)
              }
            } catch (e) { console.warn('[game] apply auction_bid_update failed', e) }
          })
          .on('broadcast', { event: 'round_updated' }, async (payload) => {
            try {
              const { round, total } = payload.payload || {}
              if (typeof round === 'number') this.roundCount = round
              if (typeof total === 'number') this.totalRounds = total
            } catch (e) { console.warn('[game] apply round_updated failed', e) }
          })
          .on('broadcast', { event: 'game_ended' }, async (_payload) => {
            try {
              this.$store.commit('SET_GAME_PHASE', 'settlement')
              this.showGameEndDialog = true
              if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
            } catch (e) { console.warn('[game] handle game_ended failed', e) }
          })
          .on('broadcast', { event: 'auction_ended' }, async (_payload) => {
            // 拍卖结束后以数据库为准刷新房间状态和手牌归属
            try {
              await this.loadRoomState()
            } catch (e) { console.warn('[game] refresh after auction_ended failed', e) }
          })
          .on('broadcast', { event: 'chat_message' }, async (payload) => {
            console.log('[game] received chat_message broadcast', payload)
            this.chatMessages.push(payload.payload)
            // 滚动到最新消息
            this.$nextTick(() => {
              const chatContainer = this.$refs.chatContainer
              if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight
              }
            })
          })
          .subscribe()
        // 兜底短轮询（如果订阅不可用，仍保证近实时）
        if (!this.refreshTimer) {
          this.refreshTimer = setInterval(this.loadRoomState, 1000)
        }
      } catch (e) { console.warn('[game] subscribe realtime failed', e); if (!this.refreshTimer) { this.refreshTimer = setInterval(this.loadRoomState, 1000) } }
    },
    unsubscribeRoomRealtime() {
      if (this.roomChannel) { try { this.roomChannel.unsubscribe() } catch (e) {} this.roomChannel = null }
      if (this.broadcastChannel) { try { this.broadcastChannel.unsubscribe() } catch (e) {} this.broadcastChannel = null }
    },
    async loadRoomState() {
      try {
        const rid = this.$store.state.roomId
        if (!rid) { this.room = null; return }
        const room = await roomService.getRoom(rid)
        const players = (room && room.room_players) ? [...room.room_players] : []
        // 优先按 seat_index 排序以稳定座位显示
        players.sort((a,b) => {
          const ai = (typeof a.seat_index === 'number') ? a.seat_index : 9999
          const bi = (typeof b.seat_index === 'number') ? b.seat_index : 9999
          return ai - bi
        })
        room.room_players = players
        this.room = room
        // 当房间处于等待状态，明确切到准备界面
        if (room && room.status === 'waiting') {
          this.$store.commit('SET_GAME_PHASE', 'preparation')
          // 房间处于等待：清理本地拍卖倒计时
          if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
          this.$set(this, 'auctionCountdown', 0)
          this.$store.commit('SET_CURRENT_AUCTIONS', [])
        }
        // 同步数据库中的活跃拍卖到本地状态（仅在房间状态为 playing 时）
        if (room && room.status === 'playing') {
          try {
            const supabase = getSupabase()
            const { data: dbAuctions } = await supabase
              .from('auctions')
              .select('*')
              .eq('status', 'active')
              .eq('room_id', rid)
            const existingIds = new Set((this.$store.state.currentAuctions || []).map(a => a.id))
            for (const row of (dbAuctions || [])) {
              if (existingIds.has(row.id)) continue
              const artifact = row.artifact || this.artifactMap[row.artifact_id] || { id: row.artifact_id, name: row.artifact_id }
              const auction = {
                id: row.id,
                artifact,
                highestBid: row.highest_bid || 0,
                highestBidder: row.highest_bidder || null,
                timeRemaining: typeof row.time_remaining === 'number' ? row.time_remaining : 30,
                bids: [],
                startTime: Date.now(),
                status: 'active',
                _timer: null
              }
              this.$store.commit('ADD_OR_UPDATE_AUCTION', auction)
            }
            if ((dbAuctions || []).length > 0) {
              this.$store.commit('SET_GAME_PHASE', 'auction')
            }
          } catch (e) {
            console.warn('[game] sync active auctions failed', e)
          }
        }
        
        // 检查游戏是否结束
        if (room.status === 'ended') {
          this.$store.commit('SET_GAME_PHASE', 'settlement')
          // 游戏结束后，显示结算界面并在短暂展示后自动返回房间
          this.showGameEndDialog = true
          setTimeout(() => { this.handleGameEnd() }, 3000)
        }
        
        // 同步加载玩家资料（用户名与头像）
        const ids = Array.from(new Set(players.map(p => p.user_id).filter(Boolean)))
        if (ids.length > 0) {
          const supabase = getSupabase()
          const { data: profs } = await supabase.from('profiles').select('id, username, avatar').in('id', ids)
          const map = {}
          ;(profs || []).forEach(p => { map[p.id] = { username: p.username, avatar: p.avatar } })
          this.profileMap = map
        } else {
          this.profileMap = {}
        }
        // 同步当前用户的手牌（从数据库 room_artifacts 获取，而不是用前端状态）
        try {
          const uid = this.$store.state.user && this.$store.state.user.id
          if (rid && uid) {
            const supabase = getSupabase()
            const { data: owned } = await supabase
              .from('room_artifacts')
              .select('artifact_id')
              .eq('room_id', rid)
              .eq('owner_user_id', uid)
            const aids = (owned || []).map(r => r.artifact_id)
            // 更新 store 中当前玩家的手牌
            const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === uid)
            if (me) {
              const next = {
                id: me.user_id,
                name: this.getNameFor(me.user_id),
                energy: 50,
                artifacts: aids,
                items: []
              }
              this.$store.commit('SET_CURRENT_PLAYER', next)
              this.$store.commit('SET_PLAYER_ARTIFACTS', aids)
            }
          }
        } catch (e) {
          console.warn('[game] sync player hand from DB failed', e)
        }
      } catch (e) { console.warn('[game] loadRoomState failed', e) }
    },
    async toggleReady() {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid) return
        const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === uid)
        const next = !(me && me.is_ready)
        await roomService.setReady(rid, uid, next)
        await this.loadRoomState()
      } catch (e) { console.warn('[game] toggleReady failed', e) }
    },
    async moveToSeat(idx) {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid) return
        const seats = this.seats
        const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === uid)
        const myOld = (me && typeof me.seat_index === 'number') ? me.seat_index : -1
        const target = seats[idx] && seats[idx].player
        if (target && target.user_id !== uid) {
          // 简单交换：先清空对方座位，再占用目标座位，再把对方放到我的旧座位（或空）
          await roomService.setSeat(rid, target.user_id, null)
          await roomService.setSeat(rid, uid, idx)
          if (myOld >= 0) await roomService.setSeat(rid, target.user_id, myOld)
        } else {
          // 目标为空或是自己，直接移动
          await roomService.setSeat(rid, uid, idx)
        }
        // 乐观更新：立即更新本地数据以提升响应
        if (me) { me.seat_index = idx }
        await this.loadRoomState()
      } catch (e) { console.warn('[game] moveToSeat failed', e) }
    },
    async leaveRoom() {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid) return
        // 先本地立即止表&清UI，避免等待网络请求期间继续倒计时
        if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
        this.$set(this, 'auctionCountdown', 0)
        this.$store.commit('SET_GAME_PHASE', 'preparation')
        this.$store.commit('SET_CURRENT_AUCTIONS', [])
        try { auctionService.stopAll() } catch (_) {}
        // 调用服务端退出
        await roomService.leaveRoom(rid, uid)
        // 取消订阅并路由跳转
        this.unsubscribeRoomRealtime()
        this.$store.commit('SET_ROOM_ID', null)
        this.room = null
        this.$router.push('/rooms')
      } catch (e) {
        console.warn('[game] leaveRoom failed', e)
      }
    },
    
    // 游戏结束处理
    async handleGameEnd() {
      try {
        const rid = this.$store.state.roomId
        if (rid) {
          // 将房间状态重置为 waiting，便于继续房间内准备/新一局
          const supabase = getSupabase()
          await supabase.from('rooms').update({ status: 'waiting' }).eq('id', rid)
          // 跳转回房间页面（游戏页携带 roomId 即是房间界面）
          this.$router.push({ path: '/game', query: { roomId: rid, gameEnded: 'true' } })
        } else {
          this.$router.push('/rooms')
        }
      } catch (e) {
        console.warn('[game] handleGameEnd failed', e)
        // 兜底跳回房间列表
        this.$router.push('/rooms')
      }
    },
    async startGame() {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid || !this.isOwner || !this.allReady) return
        await roomService.startGame(rid, uid)
        
        // 初始化游戏状态：进入5s预倒计时
        this.$store.commit('SET_GAME_PHASE', 'countdown')
        this.$set(this, 'auctionCountdown', 5)
        // 重置并广播当前回合为0，保证所有客户端一致
        this.roundCount = 0
        try {
          const supabase = getSupabase()
          await supabase.channel(`room_cast_${rid}`).send({ type: 'broadcast', event: 'round_updated', payload: { round: this.roundCount, total: this.totalRounds } })
        } catch (_) {}
        this.$store.commit('ADD_GAME_LOG', { timestamp: Date.now(), message: '游戏开始！所有玩家获得50点初始能量（5s后开始拍卖）' })
        
        // 初始化当前玩家数据
        const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === uid)
        if (me) {
          this.$store.commit('SET_CURRENT_PLAYER', {
            id: me.user_id,
            name: this.getNameFor(me.user_id),
            energy: 50,
            artifacts: [],
            items: []
          })
        }
        
        // 广播游戏开始事件（countdown）
        try {
          const supabase = getSupabase()
          await supabase.channel(`room_cast_${rid}`).send({
            type: 'broadcast',
            event: 'game_started',
            payload: { gamePhase: 'countdown' }
          })
        } catch (e) {
          console.warn('[game] broadcast game_started failed', e)
        }
        
        // 本地5s预倒计时，结束后再开始拍卖
        if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
        this.auctionTimer = setInterval(async () => {
          const newValue = this.auctionCountdown - 1
          this.$set(this, 'auctionCountdown', newValue)
          if (this.auctionCountdown <= 0) {
            clearInterval(this.auctionTimer)
            this.auctionTimer = null
            if (this.isOwner) {
              await this.autoStartAuction()
            }
          }
        }, 1000)
      } catch (e) { console.warn('[game] startGame failed', e) }
    },
    
    async startAuction() {
      // 同时抽取多件进行拍卖（示例为2件）
      const artifacts = await this.loadArtifacts()
      if (artifacts.length > 0) {
        const picks = []
        while (picks.length < Math.min(2, artifacts.length)) {
          const candidate = artifacts[Math.floor(Math.random() * artifacts.length)]
          if (!picks.find(p => p.id === candidate.id)) picks.push(candidate)
        }
        for (const art of picks) {
          await this.$store.dispatch('startAuction', art)
        }
      }
    },
    
    async loadArtifacts() {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('artifacts')
          .select('*')
        if (error) { throw error }
        // 直接返回数据库中的奇物列表
        return (data || []).map(row => ({
          id: row.id,
          name: row.name,
          era: row.era,
          location: row.location,
          story: row.story,
          collectionTags: row.collection_tags || [],
          baseValue: row.base_value || 0,
          image: row.image
        }))
      } catch (error) {
        console.error('加载卡牌数据失败:', error)
        return []
      }
    },
    
    openShop() {
      this.$store.commit('SET_SHOW_SHOP', true)
    },
    
    closeShop() {
      this.$store.commit('SET_SHOW_SHOP', false)
    },
    
    showArtifactDetail(artifactId) {
      // 若已加载artifactMap，则优先展示真实数据
      const artifact = this.artifactMap[artifactId]
      if (artifact) {
        this.selectedCard = artifact
      } else {
        // 回退：维持原示例
        this.selectedCard = {
          id: artifactId,
          name: '示例奇物',
          era: '古代',
          location: '未知',
          story: '这是一个神秘的奇物...',
          collectionTags: ['艺术瑰宝'],
          baseValue: 8,
          image: 'https://via.placeholder.com/300x200?text=示例奇物'
        }
      }
      this.$store.commit('SET_SHOW_CARD_DETAIL', true)
    },
    
    hideCardDetail() {
      this.$store.commit('SET_SHOW_CARD_DETAIL', false)
      this.selectedCard = null
    },
    showArtifactDetailFromAuction(artifact) {
      this.selectedCard = artifact
      this.$store.commit('SET_SHOW_CARD_DETAIL', true)
    },

    showPlayerHand(player) {
      // 构造玩家对象，包含手牌信息
      const playerData = {
        id: player.user_id,
        name: this.getNameFor(player.user_id),
        artifacts: this.currentPlayer && this.currentPlayer.id === player.user_id ? 
          (this.currentPlayer.artifacts || []) : []
      }
      this.handPlayer = playerData
      this.showHandPopup = true
    },

    hideHand() {
      this.handPlayer = null
      this.showHandPopup = false
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    },
    getAvatarFor(userId) {
      const prof = this.profileMap[userId]
      if (prof && prof.avatar) return prof.avatar
      const code = ((prof && prof.username) ? prof.username : (userId || 'U')).toString().slice(0, 2).toUpperCase()
      const bg = '334155'
      const fg = 'e2e8f0'
      const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='100%' height='100%' fill='#${bg}'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='#${fg}' font-family='Arial, sans-serif'>${code}</text></svg>`)
      return `data:image/svg+xml;charset=utf-8,${svg}`
    },
    getNameFor(userId) {
      const prof = this.profileMap[userId]
      if (prof && prof.username) return prof.username
      if (this.room && this.room.owner_id === userId) return '房主'
      return (userId || '').slice(0, 6)
    },
    
    // 加载收藏集数据：基于数据库 artifacts 的 collection_tags 动态生成
    async loadCollections() {
      try {
        // 从已加载的 artifactMap 动态汇总所有标签，并计算每个标签在全库中的可收集上限
        const tagTotal = {}
        const arts = this.artifactMap || {}
        Object.keys(arts).forEach(id => {
          const tags = Array.isArray(arts[id].collectionTags) ? arts[id].collectionTags : []
          tags.forEach(tag => { tagTotal[tag] = (tagTotal[tag] || 0) + 1 })
        })
        const list = Object.keys(tagTotal).map(tag => ({
          id: tag,
          name: tag,
          description: '',
          requiredCount: tagTotal[tag]
        }))
        this.collections = list
      } catch (error) {
        console.error('加载收藏集数据失败:', error)
        this.collections = []
      }
    },
    
    // 检查收藏集是否完成
    isCollectionCompleted(collection) {
      const currentCount = this.getCurrentCollectionCount(collection)
      return currentCount >= collection.requiredCount
    },
    
    // 获取当前收藏集数量（基于当前用户手牌，且受最大要求数上限限制）
    getCurrentCollectionCount(collection) {
      if (!this.currentPlayer || !this.currentPlayer.artifacts) return 0
      const requiredCap = Number(collection.requiredCount) || Infinity
      let count = 0
      this.currentPlayer.artifacts.forEach(artifactId => {
        const artifact = this.artifactMap[artifactId]
        if (artifact && artifact.collectionTags && artifact.collectionTags.includes(collection.name)) {
          count++
        }
      })
      return Math.min(count, requiredCap)
    },
    
    // 获取收藏集进度百分比
    getCollectionProgress(collection) {
      const current = this.getCurrentCollectionCount(collection)
      const required = collection.requiredCount
      return Math.min((current / required) * 100, 100)
    },
    
    // 关闭游戏结束对话框
    closeGameEndDialog() {
      this.showGameEndDialog = false
    },
    
    // 留在房间
    stayInRoom() {
      this.showGameEndDialog = false
      // 保持在当前房间，不进行任何跳转
    },
    
    // 返回房间列表
    goToRooms() {
      this.showGameEndDialog = false
      this.unsubscribeRoomRealtime()
      this.$store.commit('SET_ROOM_ID', null)
      this.room = null
      this.$router.push('/rooms')
    },
    
    // 时间到：结束当前所有拍卖并结算到对应玩家手牌，然后进入10s间歇
    async onAuctionTimeUp() {
      try {
        const auctions = this.$store.state.currentAuctions || []
        // 统一倒计时结束：结束所有当前拍卖
        for (const a of auctions) {
          await this.$store.dispatch('endAuction', a.id)
        }
        // 进入10s间歇阶段
        this.startIntermissionTimer(10)
      } catch (e) { console.warn('[game] onAuctionTimeUp failed', e) }
    },

    // 开始拍卖倒计时：统一每轮拍卖只有一个倒计时
    startAuctionTimer(duration = 30) {
      // 首先清除任何可能存在的计时器
      if (this.auctionTimer) {
        clearInterval(this.auctionTimer)
        this.auctionTimer = null
      }
      
      // 设置游戏阶段为拍卖
      this.$store.commit('SET_GAME_PHASE', 'auction')
      
      // 初始化倒计时时间
      this.$set(this, 'auctionCountdown', duration)
      console.log('拍卖倒计时初始化:', this.auctionCountdown)
      
      // 开始倒计时
      this.auctionTimer = setInterval(async () => {
        // 确保倒计时正确递减
        const newValue = this.auctionCountdown - 1
        this.$set(this, 'auctionCountdown', newValue)
        console.log('拍卖倒计时:', this.auctionCountdown)
        
        // 倒计时结束处理
        if (this.auctionCountdown <= 0) {
          clearInterval(this.auctionTimer)
          this.auctionTimer = null
          await this.onAuctionTimeUp()
        }
      }, 1000)
    },


    
    // 每轮之间的间歇计时器，结束后自动开始下一轮拍卖
    startIntermissionTimer(duration = 10) {
      if (this.auctionTimer) {
        clearInterval(this.auctionTimer)
        this.auctionTimer = null
      }
      this.$store.commit('SET_GAME_PHASE', 'intermission')
      this.$set(this, 'auctionCountdown', duration)
      this.auctionTimer = setInterval(async () => {
        const newValue = this.auctionCountdown - 1
        this.$set(this, 'auctionCountdown', newValue)
        if (this.auctionCountdown <= 0) {
          clearInterval(this.auctionTimer)
          this.auctionTimer = null
          if (this.isOwner) {
            await this.autoStartAuction()
          }
        }
      }, 1000)
    },
    
    // 自动开始拍卖
    async autoStartAuction() {
      try {
        // 设置游戏阶段为拍卖
        this.$store.commit('SET_GAME_PHASE', 'auction')
        
        // 加载拍卖物品
        const artifacts = await this.loadArtifacts()
        if (artifacts.length > 0) {
          // 选择拍卖物品
          const picks = []
          while (picks.length < Math.min(2, artifacts.length)) {
            const candidate = artifacts[Math.floor(Math.random() * artifacts.length)]
            if (!picks.find(p => p.id === candidate.id)) picks.push(candidate)
          }
          
          // 去重：避免同一房间存在相同 artifact 的活动拍卖
          const existingArtifactIds = new Set((this.$store.state.currentAuctions || []).map(a => a.artifact && a.artifact.id))
          const uniquePicks = picks.filter(a => !existingArtifactIds.has(a.id))
          // 开始拍卖
          for (const art of uniquePicks) {
            await this.$store.dispatch('startAuction', art)
          }
          
          // 启动统一拍卖倒计时
          this.startAuctionTimer(30)
          
          // 广播拍卖开始事件（发送所有artifact和持续时间），并同步更新回合数
          const rid = this.$store.state.roomId
          if (rid) {
            const supabase = getSupabase()
            await supabase.channel(`room_cast_${rid}`).send({
              type: 'broadcast',
              event: 'auction_started',
              payload: { artifacts: picks, duration: 30 }
            })
            // 仅房主增加回合并广播（非房主不修改回合）
            this.roundCount = Math.min(this.roundCount + 1, this.totalRounds)
            await supabase.channel(`room_cast_${rid}`).send({ type: 'broadcast', event: 'round_updated', payload: { round: this.roundCount, total: this.totalRounds } })
            // 达到6回合则结束游戏
            if (this.roundCount >= this.totalRounds) {
              try {
                await supabase.from('rooms').update({ status: 'ended' }).eq('id', rid)
              } catch (_) {}
              await supabase.channel(`room_cast_${rid}`).send({ type: 'broadcast', event: 'game_ended', payload: { reason: 'round_limit' } })
            }
          }
        }
      } catch (e) {
        console.warn('[game] autoStartAuction failed', e)
      }
    },
    
    // 发送聊天消息
    async sendMessage() {
      if (!this.newMessage.trim() || !this.user) return
      
      const message = {
        id: Date.now(),
        userId: this.user.id,
        username: this.getNameFor(this.user.id),
        content: this.newMessage.trim(),
        timestamp: Date.now()
      }
      
      this.chatMessages.push(message)
      this.newMessage = ''
      
      // 广播消息给其他玩家
      const rid = this.$store.state.roomId
      if (rid) {
        try {
          const supabase = getSupabase()
          await supabase.channel(`room_cast_${rid}`).send({
            type: 'broadcast',
            event: 'chat_message',
            payload: message
          })
        } catch (e) {
          console.warn('[game] sendMessage failed', e)
        }
      }
    },
    
    // 格式化消息时间
    formatMessageTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
      } else {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      }
    }
  }
}
</script>

<style scoped>
.game-container {
  min-height: 100vh;
  background: 
    radial-gradient(1200px circle at 20% 10%, #0b1220, #0f172a),
    radial-gradient(800px circle at 80% 30%, rgba(59,130,246,0.08), rgba(59,130,246,0)),
    linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  position: relative;
  overflow-x: hidden;
}

.game-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.top-auth-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: saturate(180%) blur(8px);
}
.top-auth-bar .brand { font-weight: 600; color: #334155; }
.top-auth-bar .right { display: flex; align-items: center; gap: 8px; }
.nav-button { background: #eaecef; border-radius: 8px; padding: 6px 10px; }
.nav-button.primary { background: #3b82f6; color: #fff; }

.game-status {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  margin: 16px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10;
}
.player-energy-hud {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15));
  border: 1px solid rgba(59,130,246,0.35);
  color: #e2e8f0;
  padding: 6px 10px;
  border-radius: 16px;
}
.player-energy-hud .icon { font-size: 14px; }
.player-energy-hud .label { font-size: 12px; color:#94a3b8; }
.player-energy-hud .value { font-weight: 700; }
.game-phase {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.game-controls {
  display: flex;
  gap: 8px;
}

.control-button {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
}

.control-button.danger { background: #ef4444; }

.control-button:hover {
  background: #45a049;
}

.players-avatars { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 12px; 
  padding: 12px 16px; 
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin: 16px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 5;
  flex-wrap: wrap;
  min-height: 60px;
}

.avatar-item { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 6px; 
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px;
  border-radius: 12px;
  position: relative;
}

.avatar-item:hover {
  transform: translateY(-4px);
  background: rgba(59, 130, 246, 0.1);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
}

.player-avatar { 
  width: 40px; 
  height: 40px; 
  border-radius: 50%; 
  border: 2px solid rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
}

.avatar-item:hover .player-avatar {
  border-color: rgba(59, 130, 246, 0.6);
  transform: scale(1.1);
}

.ready-indicator { 
  position: absolute; 
  right: 2px; 
  bottom: 2px; 
  width: 12px; 
  height: 12px; 
  border-radius: 50%; 
  background: #ef4444; 
  box-shadow: 0 0 0 2px #0f172a; 
  transition: all 0.3s ease;
}

.ready-indicator.on { 
  background: #10b981; 
  animation: statusPulse 2s infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.player-name { 
  font-size: 11px; 
  color: #e2e8f0; 
  text-align: center;
  font-weight: 500;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seats { display:grid; gap: 10px; padding: 12px 16px; }
.seat { background:#0f172a; border:1px solid #1f2937; border-radius:12px; padding:8px; color:#e2e8f0; text-align:center; transition: transform .1s ease, box-shadow .1s ease; }
.seat:hover { transform: translateY(-1px); box-shadow:0 8px 24px rgba(2,6,23,.35); }
.seat.occupied { border-color:#10b981; }
.seat-index { font-size:12px; color:#94a3b8; }
.seat-body { margin-top:6px; }
.seat-empty { color:#94a3b8; }
.seat-player { display:flex; flex-direction:column; align-items:center; gap:6px; }
.avatar-wrap { position:relative; }
.seat-avatar { width:40px; height:40px; border-radius:50%; border:1px solid #1f2937; }
.ready-badge { position:absolute; right:-6px; bottom:-6px; background:#10b981; color:#fff; border-radius:50%; font-size:12px; width:18px; height:18px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 2px #0f172a; }
.seat-name { font-size:12px; }

.players-section { margin: 16px 0; }
.avatar-grid { display:flex; flex-wrap:wrap; gap:12px; padding: 0 16px; }
.auction-stage { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  min-height: 320px; 
  margin: 16px; 
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.auction-stage::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.stage-placeholder { 
  color: #94a3b8; 
  text-align: center;
  position: relative;
  z-index: 1;
}

.my-hand { 
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin: 16px;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 5;
}

.hand-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 16px 0;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hand-grid { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 12px; 
}

.hand-card { 
  width: 160px; 
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(55, 65, 81, 0.8));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.hand-card:hover {
  transform: translateY(-8px) scale(1.05);
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 16px 32px rgba(59, 130, 246, 0.3);
}

.hand-image { 
  width: 100%; 
  height: 100px; 
  object-fit: cover;
  transition: all 0.3s ease;
}

.hand-card:hover .hand-image {
  transform: scale(1.1);
}

.hand-name { 
  font-size: 13px; 
  color: #e2e8f0; 
  padding: 8px 12px;
  font-weight: 500;
  line-height: 1.3;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 16px 8px;
}


.collections-title {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 16px;
  text-align: center;
}

.collections-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collection-progress-item {
  background: linear-gradient(135deg, #1f2937, #374151);
  border: 1px solid #4b5563;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.collection-progress-item.completed {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
}

.collection-progress-item.completed::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
  opacity: 1;
}

.collection-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.collection-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.collection-info {
  flex: 1;
}

.collection-name {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.collection-description {
  font-size: 12px;
  color: #94a3b8;
}

.collection-reward {
  flex-shrink: 0;
}

.reward-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #374151;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
}

.collection-progress-item.completed .progress-fill {
  background: linear-gradient(90deg, #10b981, #059669);
}

.progress-text {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.my-hand { background:#0f172a; border:1px solid #1f2937; margin:16px; border-radius:12px; padding:12px; }
.hand-grid { display:flex; flex-wrap:wrap; gap:8px; }
.hand-card { width:160px; background:#0b1220; border:1px solid #1f2937; border-radius:12px; overflow:hidden; }
.hand-image { width:100%; height:100px; object-fit:cover; }
.hand-name { font-size:13px; color:#e2e8f0; padding:6px 8px; }

/* 弹窗样式 */
.card-detail-popup, .shop-popup {
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
  object-fit: cover;
}

.detail-content {
  margin-bottom: 16px;
}

.detail-name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.detail-era {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.detail-story {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
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

.hand-title { font-size:18px; font-weight:600; color:#334155; margin:0 16px 16px; }
.hand-grid { display:flex; flex-wrap:wrap; gap:8px; }
.hand-card { width:160px; background:#0b1220; border:1px solid #1f2937; border-radius:12px; overflow:hidden; }
.hand-image { width:100%; height:100px; object-fit:cover; }
.hand-name { font-size:13px; color:#e2e8f0; padding:6px 8px; }

/* 游戏结束对话框样式 */
.game-end-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2000;
}

.game-end-content {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: 1px solid #374151;
  border-radius: 20px;
  padding: 40px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.game-end-header {
  margin-bottom: 32px;
}

.game-end-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.game-end-title {
  font-size: 2rem;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 8px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-end-subtitle {
  font-size: 1.125rem;
  color: #94a3b8;
  margin: 0;
}

.game-end-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;
}

.action-button.primary {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
}

.action-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
}

.action-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 18px;
}

/* 倒计时样式 */
.countdown-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border: 1px solid #1f2937;
  border-radius: 12px;
}

.countdown-content {
  text-align: center;
  color: #e2e8f0;
}

.countdown-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.countdown-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: #e2e8f0;
}

.countdown-timer {
  font-size: 3rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 16px;
  text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
  animation: countdownPulse 1s infinite;
}

@keyframes countdownPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.countdown-subtitle {
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
}

/* 收藏集面板样式 */
.collections-panel {
  position: fixed;
  top: 120px;
  left: 16px;
  width: 300px;
  max-height: calc(100vh - 140px);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  padding: 24px;
  z-index: 5;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
}

/* 聊天面板样式 */
.chat-panel {
  position: fixed;
  top: 200px;
  right: 16px;
  width: 320px;
  height: calc(100vh - 220px);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  z-index: 5;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(55, 65, 81, 0.8));
}

.chat-title {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
}

.chat-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: statusPulse 2s infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 12px;
  color: #94a3b8;
}

.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-message.own-message {
  align-items: flex-end;
}

.chat-message.own-message .message-content {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.message-username {
  color: #e2e8f0;
  font-weight: 600;
}

.message-time {
  color: #94a3b8;
}

.message-content {
  background: #1f2937;
  color: #e2e8f0;
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 80%;
  word-wrap: break-word;
  line-height: 1.4;
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #1f2937;
  background: #0f172a;
}

.message-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #374151;
  border-radius: 8px;
  background: #1f2937;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
}

.message-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.message-input::placeholder {
  color: #94a3b8;
}

.send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.send-icon {
  font-size: 16px;
}
/* 开始游戏后的布局优化：让拍卖台与手牌更大，功能分区互不遮挡，移动端适配 */
.post-start {
  display: grid;
  grid-template-areas:
    'status status status'
    'avatars avatars avatars'
    'sidebar-left stage sidebar-right'
    'hand hand hand';
  grid-template-columns: 280px 1fr 320px;
  grid-auto-rows: min-content;
  gap: 12px;
}
.post-start .game-status { grid-area: status; margin: 0; }
.post-start .players-avatars { grid-area: avatars; margin: 0; }
.post-start .auction-stage { grid-area: stage; margin: 0; min-height: 420px; }
.post-start .my-hand { grid-area: hand; margin: 0; }
.post-start .collections-panel { grid-area: sidebar-left; position: static; margin: 0; }
.post-start .chat-panel { grid-area: sidebar-right; position: static; margin: 0; }

/* 侧边面板尺寸与滚动 */
.post-start .collections-panel,
.post-start .chat-panel {
  max-height: 100%;
  overflow: hidden;
}
.post-start .collections-panel .collections-section,
.post-start .chat-panel .chat-messages {
  overflow-y: auto;
}

/* 扩大手牌显示面积与卡牌尺寸 */
.post-start .my-hand { padding: 16px 16px 20px; }
.post-start .hand-grid { gap: 12px; }
.post-start .hand-card { width: 180px; }
.post-start .hand-image { height: 120px; }

/* 顶部头像区域可横向滚动，避免遮挡 */
.post-start .players-avatars {
  overflow-x: auto;
  white-space: nowrap;
}
.post-start .players-avatars .avatar-item {
  display: inline-flex;
}

/* 移动端适配：改为单列纵向排布，拍卖台与手牌优先显示 */
@media (max-width: 768px) {
  .post-start {
    grid-template-areas:
      'status'
      'avatars'
      'stage'
      'hand'
      'sidebar-left'
      'sidebar-right';
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .post-start .auction-stage { min-height: 360px; }
  .post-start .hand-card { width: calc((100vw - 32px - 16px) / 2); }
  .post-start .hand-image { height: 110px; }
  .post-start .collections-panel,
  .post-start .chat-panel {
    max-height: 300px;
    overflow: hidden;
  }
  .post-start .chat-messages { max-height: 240px; }
}

/* 更大屏幕下进一步扩大拍卖台与手牌 */
@media (min-width: 1200px) {
  .post-start {
    grid-template-columns: 320px 1fr 360px;
  }
  .post-start .auction-stage { min-height: 500px; }
  .post-start .hand-card { width: 200px; }
  .post-start .hand-image { height: 130px; }
}

/* 开始游戏后隐藏顶部账号栏，避免影响拍卖沉浸感 */
.post-start .top-auth-bar { display: none; }

/* 手牌采用自适应栅格，保证整齐排版并扩大占比 */
.post-start .hand-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }

</style>