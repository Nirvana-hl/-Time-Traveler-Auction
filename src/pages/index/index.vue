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
import { startCountdown, clearCountdown } from '../../features/game/countdown'
import { loadRoomState as loadRoomStateService } from '../../features/game/room-state.service'
import { subscribeRoomRealtime as subscribeRoomRealtimeService, unsubscribeRoomRealtime as unsubscribeRoomRealtimeService } from '../../features/game/room-realtime'
import { startGame as startGameFlow, autoStartAuction as autoStartAuctionFlow } from '../../features/game/auction-flow.service'
import { sendChatMessage } from '../../features/game/chat.service'
import { toggleReady as toggleReadyAction, moveToSeat as moveToSeatAction, leaveRoom as leaveRoomAction } from '../../features/game/room-actions.service'
import { loadArtifacts as loadArtifactsService } from '../../features/game/artifacts.service'
import { loadCollectionsFromArtifacts, getCurrentCollectionCount as getCollectionCountUtil, getCollectionProgress as getCollectionProgressUtil } from '../../features/game/collections.utils'
import { formatMessageTime as formatMessageTimeHelper, getAvatarFor as getAvatarForHelper, getNameFor as getNameForHelper } from '../../features/game/ui.helpers'
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
      chatChannel: null,
      countdownInProgress: false
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
      const rid = this.$store.state.roomId
      if (!rid) return
      const supabase = getSupabase()
      const { roomChannel, broadcastChannel } = subscribeRoomRealtimeService(
        { roomId: rid, supabase, onLoadRoomState: this.loadRoomState },
        {
          onGameStarted: async (_payload) => {
            // 防止重复启动多个倒计时
            if (this.countdownInProgress) return
            this.countdownInProgress = true
            this.$store.commit('SET_GAME_PHASE', 'countdown')
            this.$set(this, 'auctionCountdown', 5)
            const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === this.$store.state.user.id)
            if (me) {
              this.$store.commit('SET_CURRENT_PLAYER', { id: me.user_id, name: this.getNameFor(me.user_id), energy: 50, artifacts: [], items: [] })
            }
            if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
            this.$nextTick(() => {
              startCountdown({
                seconds: 5,
                onTick: (s) => { this.$set(this, 'auctionCountdown', s) },
                onDone: async () => { this.countdownInProgress = false; if (this.isOwner) { await this.autoStartAuction() } },
                getRef: () => this.auctionTimer,
                setRef: (id) => { this.auctionTimer = id },
              })
            })
          },
          onAuctionStarted: (duration) => { this.startAuctionTimer(duration) },
          onBidUpdate: ({ auctionId, highestBid, highestBidder }) => {
            if (!auctionId) return
            const list = this.$store.state.currentAuctions || []
            const idx = list.findIndex(a => a.id === auctionId)
            if (idx >= 0) {
              const next = { ...list[idx], highestBid, highestBidder }
              this.$store.commit('ADD_OR_UPDATE_AUCTION', next)
            }
          },
          onRoundUpdated: ({ round, total }) => {
            if (typeof round === 'number') this.roundCount = round
            if (typeof total === 'number') this.totalRounds = total
          },
          onGameEnded: () => {
            this.$store.commit('SET_GAME_PHASE', 'settlement')
            this.showGameEndDialog = true
            if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
          },
          onAuctionEnded: async () => { await this.loadRoomState() },
          onChatMessage: (message) => {
            this.chatMessages.push(message)
            this.$nextTick(() => {
              const chatContainer = this.$refs.chatContainer
              if (chatContainer) { chatContainer.scrollTop = chatContainer.scrollHeight }
            })
          },
        },
        () => { if (!this.refreshTimer) { this.refreshTimer = setInterval(this.loadRoomState, 1000) } }
      )
      this.roomChannel = roomChannel
      this.broadcastChannel = broadcastChannel
    },
    unsubscribeRoomRealtime() {
      unsubscribeRoomRealtimeService(this.roomChannel, this.broadcastChannel)
      this.roomChannel = null
      this.broadcastChannel = null
    },
    async loadRoomState() {
      const rid = this.$store.state.roomId
      const supabase = getSupabase()
      await loadRoomStateService({
        roomId: rid,
        roomService,
        supabase,
        artifactMap: this.artifactMap,
        store: this.$store,
        setRoom: (room) => { this.room = room },
        setProfileMap: (map) => { this.profileMap = map },
        setGamePhase: (phase) => { this.$store.commit('SET_GAME_PHASE', phase) },
        clearAuctionTimer: () => { if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null } },
        setAuctionCountdown: (n) => { this.$set(this, 'auctionCountdown', n) },
        onShowGameEnd: () => { this.showGameEndDialog = true; setTimeout(() => { this.handleGameEnd() }, 3000) },
      })
    },
    async toggleReady() {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid) return
        await toggleReadyAction({ roomId: rid, userId: uid, room: this.room, roomService, reload: this.loadRoomState })
      } catch (e) { console.warn('[game] toggleReady failed', e) }
    },
    async moveToSeat(idx) {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid) return
        const targetSeat = { index: idx, player: this.seats[idx] && this.seats[idx].player }
        await moveToSeatAction({ roomId: rid, userId: uid, room: this.room, seats: targetSeat, roomService, reload: this.loadRoomState })
      } catch (e) { console.warn('[game] moveToSeat failed', e) }
    },
    async leaveRoom() {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid) return
        await leaveRoomAction({
          roomId: rid,
          userId: uid,
          clearAuctionTimer: () => { if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null } },
          setCountdown: (n) => { this.$set(this, 'auctionCountdown', n) },
          store: this.$store,
          auctionService,
          roomService,
          unsubscribe: () => this.unsubscribeRoomRealtime(),
          setRoomId: (v) => this.$store.commit('SET_ROOM_ID', v),
          setLocalRoom: (v) => { this.room = v },
          navigateToRooms: () => this.$router.push('/rooms'),
        })
      } catch (e) { console.warn('[game] leaveRoom failed', e) }
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
        const supabase = getSupabase()
        this.roundCount = 0
        await startGameFlow({
          roomId: rid,
          userId: uid,
          isOwner: this.isOwner,
          allReady: this.allReady,
          store: this.$store,
          supabase,
          setCountdown: (n) => this.$set(this, 'auctionCountdown', n),
          setCurrentPlayerFromRoom: () => {
            const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === uid)
            if (me) { this.$store.commit('SET_CURRENT_PLAYER', { id: me.user_id, name: this.getNameFor(me.user_id), energy: 50, artifacts: [], items: [] }) }
          },
          onCountdownDone: async () => {
            if (this.isOwner) { await this.autoStartAuction() }
          },
        })
        // 房主本地也启动预倒计时，防止广播不回传导致不触发 onGameStarted
        if (!this.countdownInProgress) {
          this.countdownInProgress = true
          this.$store.commit('SET_GAME_PHASE', 'countdown')
          this.$set(this, 'auctionCountdown', 5)
          const me = (this.room && this.room.room_players ? this.room.room_players : []).find(p => p.user_id === uid)
          if (me) {
            this.$store.commit('SET_CURRENT_PLAYER', { id: me.user_id, name: this.getNameFor(me.user_id), energy: 50, artifacts: [], items: [] })
          }
          if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
          this.$nextTick(() => {
            startCountdown({
              seconds: 5,
              onTick: (s) => { this.$set(this, 'auctionCountdown', s) },
              onDone: async () => { this.countdownInProgress = false; if (this.isOwner) { await this.autoStartAuction() } },
              getRef: () => this.auctionTimer,
              setRef: (id) => { this.auctionTimer = id },
            })
          })
        }
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
        return await loadArtifactsService({ supabase })
      } catch (error) { console.error('加载卡牌数据失败:', error); return [] }
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
    getAvatarFor(userId) { return getAvatarForHelper({ profileMap: this.profileMap, userId }) },
    getNameFor(userId) { return getNameForHelper({ profileMap: this.profileMap, room: this.room, userId }) },
    
    // 加载收藏集数据：基于数据库 artifacts 的 collection_tags 动态生成
    async loadCollections() {
      try { this.collections = loadCollectionsFromArtifacts(this.artifactMap) }
      catch (error) { console.error('加载收藏集数据失败:', error); this.collections = [] }
    },
    
    // 检查收藏集是否完成
    isCollectionCompleted(collection) {
      const owned = (this.currentPlayer && this.currentPlayer.artifacts) ? this.currentPlayer.artifacts : []
      const currentCount = getCollectionCountUtil({ artifactMap: this.artifactMap, ownedArtifactIds: owned, collection })
      return currentCount >= collection.requiredCount
    },
    
    // 获取当前收藏集数量（基于当前用户手牌，且受最大要求数上限限制）
    getCurrentCollectionCount(collection) {
      const owned = (this.currentPlayer && this.currentPlayer.artifacts) ? this.currentPlayer.artifacts : []
      return getCollectionCountUtil({ artifactMap: this.artifactMap, ownedArtifactIds: owned, collection })
    },
    
    // 获取收藏集进度百分比
    getCollectionProgress(collection) {
      const current = this.getCurrentCollectionCount(collection)
      const required = collection.requiredCount
      return getCollectionProgressUtil({ current, required })
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
      this.$store.commit('SET_GAME_PHASE', 'auction')
      startCountdown({
        seconds: duration,
        onTick: (s) => { this.$set(this, 'auctionCountdown', s); },
        onDone: async () => { await this.onAuctionTimeUp() },
        getRef: () => this.auctionTimer,
        setRef: (id) => { this.auctionTimer = id },
      })
    },


    
    // 每轮之间的间歇计时器，结束后自动开始下一轮拍卖
    startIntermissionTimer(duration = 10) {
      this.$store.commit('SET_GAME_PHASE', 'intermission')
      startCountdown({
        seconds: duration,
        onTick: (s) => { this.$set(this, 'auctionCountdown', s); },
        onDone: async () => {
          if (this.isOwner) {
            await this.autoStartAuction()
          }
        },
        getRef: () => this.auctionTimer,
        setRef: (id) => { this.auctionTimer = id },
      })
    },
    
    // 自动开始拍卖
    async autoStartAuction() {
      try {
        const rid = this.$store.state.roomId
        const supabase = getSupabase()
        await autoStartAuctionFlow({
          roomId: rid,
          store: this.$store,
          supabase,
          loadArtifacts: () => this.loadArtifacts(),
          dispatchStartAuction: (art) => this.$store.dispatch('startAuction', art),
          startAuctionTimer: (sec) => this.startAuctionTimer(sec),
          roundCount: this.roundCount,
          totalRounds: this.totalRounds,
          setRoundCount: (n) => { this.roundCount = n },
        })
      } catch (e) { console.warn('[game] autoStartAuction failed', e) }
    },
    
    // 发送聊天消息
    async sendMessage() {
      if (!this.newMessage.trim() || !this.user) return
      const message = { id: Date.now(), userId: this.user.id, username: this.getNameFor(this.user.id), content: this.newMessage.trim(), timestamp: Date.now() }
      this.chatMessages.push(message)
      this.newMessage = ''
      const rid = this.$store.state.roomId
      if (rid) { try { const supabase = getSupabase(); await sendChatMessage({ supabase, roomId: rid, message }) } catch (e) { console.warn('[game] sendMessage failed', e) } }
    },
    
    // 格式化消息时间
    formatMessageTime(timestamp) { return formatMessageTimeHelper(timestamp) }
  }
}
</script>

<style lang="scss" scoped src="./index.scss"></style>