<template>
  <div class="game-container" :class="{ 'post-start': gamePhase !== 'preparation' }">
    <!-- 顶部状态栏：品牌/用户信息/导航控制（登录、个人中心、准备/开始/商店/退出） -->
    <div class="top-auth-bar">
      <div class="left">
        <span class="brand">时空旅人拍卖会</span>
      </div>
      <div class="right" v-if="user">
        <span class="user-email">{{ user.email }}</span>
        <!-- 音乐控制按钮 -->
        <button class="nav-button music-control" @click="toggleMusic" :class="{ 'music-playing': isMusicPlaying }">
          <span class="music-icon">{{ isMusicPlaying ? '🔊' : '🔇' }}</span>
          <span class="music-text">{{ isMusicPlaying ? '音乐' : '静音' }}</span>
        </button>
        <button class="nav-button" @click="$router.push('/profile')">个人中心</button>
      </div>
      <div class="right" v-else>
        <button class="nav-button primary" @click="$router.push('/login')">登录 / 注册</button>
      </div>
    </div>

    <div class="game-status">
      <div class="room-info">
        <div class="room-name">{{ room ? (room.name || '未命名房间') : '未加入房间' }}</div>
        <div class="room-meta" v-if="room">玩家 {{ playerCount }}/{{ seatCount }} · 房主：{{ ownerName }}</div>
        <div class="room-id-pill">ID: {{ room ? (room.short_id || room.id) : '-' }}</div>
      </div>
      <span class="game-phase">{{ gamePhaseText }}</span>
      <div class="game-controls">
        <button class="control-button" @click="toggleReady" v-if="gamePhase === 'preparation'">{{ currentUserReady ? '取消准备' : '准备' }}</button>
        <button class="control-button" @click="startGame" v-if="gamePhase === 'preparation' && isOwner && allReady">开始游戏</button>
        <button class="control-button" @click="startAuction" v-if="false">开始拍卖</button>
        <button class="control-button danger" @click="leaveRoom">退出房间</button>
      </div>
    </div>

    <!-- 玩家头像区域：展示房间玩家，点击头像可查看该玩家手牌（当前仅展示自己的手牌明细） -->
    <div class="players-avatars" v-if="playerCount > 0 && gamePhase !== 'preparation'">
      <div class="avatar-item" v-for="p in (room ? room.room_players : [])" :key="p.user_id" @click="showPlayerHand(p)">
        <div class="avatar-wrap">
          <img class="player-avatar" :src="getAvatarFor(p.user_id)" />
          <span class="ready-indicator" :class="{ on: !!p.is_ready }"></span>
        </div>
        <div class="player-name">{{ getNameFor(p.user_id) }}</div>
        <div class="player-value">价值 {{ getPlayerTotalValue(p.user_id) }}</div>
      </div>
    </div>

    <!-- 拍卖舞台：在不同的 gamePhase 下显示倒计时/间歇/拍卖面板或占位提示 -->
    <div class="auction-stage" :class="{ 'align-left': gamePhase === 'auction' }">
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
      
      <!-- 拍卖阶段：展示拍卖面板（当前拍品列表、轮次信息、点击卡片触发讲述） -->
      <auction-panel 
        v-else-if="gamePhase === 'auction' && $store.state.currentAuctions && $store.state.currentAuctions.length" 
        :auctions="$store.state.currentAuctions" 
        :countdown="auctionCountdown"
        :round-current="$store.state.roundCurrent"
        :round-total="$store.state.roundTotal"
        @artifact-click="showArtifactDetailFromAuction" 
      />
      <!-- 准备阶段：显示文物照片自动滑动展示 -->
      <div v-else-if="gamePhase === 'preparation'" class="preparation-stage">
        <div class="artifact-carousel-container">
          <div class="carousel-header">
            <h3 class="carousel-title">时空珍宝预览</h3>
            <p class="carousel-subtitle">准备阶段 - 即将拍卖的珍贵文物</p>
          </div>
          
          <div class="artifact-carousel">
            <div class="carousel-track" :style="{ transform: `translateX(-${currentSlide * 100}%)` }">
              <div 
                v-for="(artifact, index) in artifactCarouselData" 
                :key="index" 
                class="carousel-slide"
              >
                <div class="artifact-slide-content">
                  <div class="artifact-image-container">
                    <img 
                      class="artifact-image" 
                      :src="artifact.image || 'https://via.placeholder.com/400x300?text=文物预览'" 
                      :alt="artifact.name"
                      @error="handleImageError(artifact)"
                    />
                    <div class="artifact-overlay"></div>
                  </div>
                  <div class="artifact-info">
                    <h4 class="artifact-name">{{ artifact.name || '未知文物' }}</h4>
                    <div class="artifact-meta">
                      <span class="artifact-era" v-if="artifact.era">{{ artifact.era }}</span>
                      <span class="artifact-location" v-if="artifact.location">{{ artifact.location }}</span>
                    </div>
                    <p class="artifact-value" v-if="artifact.baseValue !== undefined">
                      基础价值: {{ artifact.baseValue }} ⚡
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 轮播控制按钮 -->
            <button class="carousel-nav carousel-prev" @click="prevSlide">
              <span>‹</span>
            </button>
            <button class="carousel-nav carousel-next" @click="nextSlide">
              <span>›</span>
            </button>
            
            <!-- 轮播指示器 -->
            <div class="carousel-indicators">
              <span 
                v-for="(artifact, index) in (artifactCarouselData || []).slice(0, 5)" 
                :key="index" 
                class="indicator-dot"
                :class="{ active: artifactCarouselData && artifactCarouselData.length > 0 && currentSlide % artifactCarouselData.length === index }"
                @click="goToSlide(index)"
              ></span>
            </div>
          </div>
        </div>
      </div>
      <!-- 其他情况显示占位提示 -->
      <div v-else class="stage-placeholder">拍卖会台空闲，等待新一轮拍卖</div>
    </div>

    <!-- 房间座位区（准备阶段）：点击空位入座，已入座玩家显示头像与准备标记 -->
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

    <!-- 当前玩家手牌：展示自己已拥有的奇物，点击查看详情（或触发讲述） -->
    <div class="my-hand" v-if="gamePhase !== 'preparation'">
      <h3 class="hand-title">我的手牌</h3>
      <div class="hand-grid">
        <div
          v-for="(aid, idx) in (currentPlayer ? currentPlayer.artifacts : [])"
          :key="aid + '-' + idx"
          class="hand-card fancy"
          @click="showArtifactDetail(aid)"
        >
          <div class="hand-media">
            <img
              class="hand-image"
              :src="artifactMap[aid] ? artifactMap[aid].image : 'https://via.placeholder.com/160x100?text=未知卡牌'"
            />
            <div class="hand-overlay"></div>
          </div>
          <div class="hand-info">
            <div class="hand-name" :title="artifactMap[aid] ? artifactMap[aid].name : aid">
              {{ artifactMap[aid] ? artifactMap[aid].name : aid }}
            </div>
            <div class="hand-era" v-if="artifactMap[aid] && (artifactMap[aid].era || artifactMap[aid].location)">
              {{ artifactMap[aid].era }}<span v-if="artifactMap[aid].location"> · {{ artifactMap[aid].location }}</span>
            </div>
            <div class="hand-tags" v-if="artifactMap[aid] && artifactMap[aid].collectionTags && artifactMap[aid].collectionTags.length">
              <span
                class="hand-tag"
                v-for="tag in artifactMap[aid].collectionTags.slice(0,2)"
                :key="tag"
              >{{ tag }}</span>
              <span class="hand-tag more" v-if="artifactMap[aid].collectionTags.length > 2">+{{ artifactMap[aid].collectionTags.length - 2 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏集进度：仅展示与自己已拥有奇物相关的收藏集，支持展开查看成员清单 -->
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
            <div class="collection-header" @click="toggleCollection(collection)">
              <div class="collection-icon">🏆</div>
              <div class="collection-info">
                <div class="collection-name">{{ collection.name }}</div>
                <div class="collection-description">{{ collection.description }}</div>
              </div>
              <div class="collection-reward" v-if="collection._current >= collection.requiredCount">
                <span class="reward-badge">✓</span>
              </div>
            </div>
            <!-- 展开展示该收藏集所需所有商品 -->
            <div class="collection-members" v-if="expandedCollections[collection.id]">
              <div class="member-item" v-for="aid in (collection.artifactIds || [])" :key="aid">
                <img class="member-image" :src="artifactMap[aid] ? artifactMap[aid].image : 'https://via.placeholder.com/60x40?text=No+Img'" />
                <div class="member-info">
                  <div class="member-name">{{ artifactMap[aid] ? artifactMap[aid].name : aid }}</div>
                  <div class="member-meta">{{ artifactMap[aid] && artifactMap[aid].era }}<span v-if="artifactMap[aid] && artifactMap[aid].location"> · {{ artifactMap[aid].location }}</span></div>
                </div>
                <div class="member-status" :class="{ owned: currentPlayer && currentPlayer.artifacts && currentPlayer.artifacts.includes(aid) }">
                  {{ currentPlayer && currentPlayer.artifacts && currentPlayer.artifacts.includes(aid) ? '已拥有' : '未拥有' }}
                </div>
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

    <!-- 聊天/日志面板：合并系统日志与聊天消息为统一时间序信息流 -->
    <div class="chat-panel" v-if="gamePhase !== 'preparation'">
      <div class="chat-header">
        <h4 class="chat-title">聊天 / 日志</h4>
        <div class="chat-status">
          <span class="status-dot"></span>
          <span class="status-text">在线</span>
        </div>
      </div>
      
      <div class="chat-messages" ref="chatContainer">
        <div 
          v-for="message in chatFeed" 
          :key="message.id"
          class="chat-message"
          :class="{ 'own-message': message.type === 'chat' && message.userId === (user && user.id), 'system-log': message.type === 'log' }"
        >
          <div class="message-header">
            <span class="message-username">{{ message.type === 'log' ? '系统' : message.username }}</span>
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

    <!-- 卡牌详情弹窗：展示所选奇物的核心信息与标签 -->
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

      <!-- 文物讲述弹层：以角色对白形式讲述 selectedCard 的关键信息 -->
      <div v-if="showNarration && selectedCard" class="narration-popup">
        <div class="popup-overlay" @click="closeNarration"></div>
        <div class="popup-content narration-content">
          <!-- 顶部：文物大图与快速元信息，图片下方显示名称 -->
          <div class="artifact-media" v-if="selectedCard">
            <img class="artifact-image-large" :src="selectedCard.image || 'https://via.placeholder.com/800x240?text=Artifact'" alt="artifact" />
            <div class="artifact-quick-meta">
              <span class="badge era" v-if="selectedCard.era">{{ selectedCard.era }}</span>
              <span class="badge location" v-if="selectedCard.location">{{ selectedCard.location }}</span>
              <span class="badge value" v-if="selectedCard.baseValue !== undefined">价值 {{ selectedCard.baseValue }}</span>
              <span class="badge tags" v-if="(selectedCard.collectionTags || []).length">{{ (selectedCard.collectionTags || []).slice(0,3).join('、') }}</span>
            </div>
          </div>
          <div class="artifact-caption" v-if="selectedCard && selectedCard.name">{{ selectedCard.name }}</div>

          <!-- 下方：人物与对白一行排列 -->
          <div class="narration-dialog">
            <!-- 左侧：角色大图与姓名 -->
            <div class="character-side" :style="{ borderColor: narrationCharacter && narrationCharacter.color ? narrationCharacter.color : '#3b82f6' }">
              <img class="character-image" :src="(narrationCharacter && narrationCharacter.image) || '/images/guide.png'" />
              <div class="character-name" :style="{ color: narrationCharacter && narrationCharacter.color ? narrationCharacter.color : '#3b82f6' }">
                {{ narrationCharacterName }}
              </div>
            </div>
            <!-- 右侧：对白气泡 -->
            <div class="speech-side">
              <div class="speech-bubble">
                <div class="speech-text">{{ typingText }}</div>
              </div>
              <div class="narration-actions">
                <button class="control-button primary" @click="closeNarration">好的</button>
              </div>
            </div>
          </div>
        </div>
      </div>


    <!-- 手牌弹窗：查看某位玩家的手牌缩略（当前仅展示当前玩家持有的真实列表） -->
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

    <!-- 游戏结束对话框：展示最终排名与赢家信息，提供回房或去列表的导航 -->
    <div v-if="showGameEndDialog" class="game-end-popup">
      <div class="popup-overlay" @click="closeGameEndDialog"></div>
      <div class="popup-content game-end-content">
        <div class="game-end-header">
          <div class="game-end-icon">🏆</div>
          <h2 class="game-end-title">游戏结束</h2>
          <p class="game-end-subtitle" v-if="winnerInfo">胜者：{{ winnerInfo.name }} · 总分 {{ winnerInfo.total }}</p>
          <p class="game-end-subtitle" v-else>感谢参与时空旅人拍卖会！</p>
        </div>
        <div class="final-scoreboard" v-if="finalScores && finalScores.length">
          <div class="score-row" v-for="(p, idx) in finalScores" :key="p.userId">
            <div class="rank">{{ idx + 1 }}</div>
            <img class="score-avatar" :src="p.avatar" />
            <div class="name">{{ p.name }}</div>
            <div class="detail">收藏集 {{ p.collectionScore }} + 奇物 {{ p.artifactScore }} = <b>{{ p.total }}</b></div>
          </div>
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
import { firstLoginDialogue as firstLoginDialogueConfig, getCurrentLanguage as getCurrentLanguageImported } from '../../config/dialogue-config'
export default {
  name: 'GameIndex',
  components: {
    AuctionPanel
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
      finalScores: [],
      winnerInfo: null,
      auctionCountdown: 0,
      auctionTimer: null,
      currentAuction: null,
      // 回合相关（前端实时显示，房主每轮开拍时广播以保持同步）
      roundCount: 0,
      totalRounds: 6,
      chatMessages: [],
      newMessage: '',
      chatChannel: null,
      countdownInProgress: false,
      expandedCollections: {},
      showNarration: false,
      typingText: '',
      typingTimer: null,
      // 存储所有玩家的手牌数据，用于价值计算
      allPlayersArtifacts: {},
      // 文物轮播相关数据
      artifactCarouselData: [],
      currentSlide: 0,
      carouselInterval: null,
      // 音乐控制相关数据
      isMusicPlaying: false,
      audioElement: null,
      musicVolume: 0.5
    }
  },
  computed: {
    ...mapState(['gamePhase', 'gameLog', 'showCardDetail', 'user', 'roomId', 'roundCurrent', 'roundTotal']),
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
        'settlement': '结算阶段'
      }
      return phaseMap[this.gamePhase] || '未知阶段'
    },
   

    // 根据当前用户手牌计算收藏集显示数据，带缓存字段，便于模板直接引用
    collectionsComputed() {
      const list = Array.isArray(this.collections) ? this.collections : []
      // 仅展示用户手牌中至少包含1件该收藏集的情况
      return list
        .map(col => {
          const current = this.getCurrentCollectionCount(col)
          const progress = Math.min((current / (col.requiredCount || 1)) * 100, 100)
          return { ...col, _current: current, _progress: progress }
        })
        .filter(col => col._current > 0)
    },

    // 合并聊天与系统日志为同一信息流，按时间排序
    chatFeed() {
      const logs = (this.gameLog || []).map((l, idx) => ({
        id: `log-${l.timestamp || idx}`,
        type: 'log',
        userId: null,
        username: '系统',
        content: l.message,
        timestamp: l.timestamp || 0
      }))
      const chats = (this.chatMessages || []).map(m => ({ ...m, type: 'chat' }))
      const merged = [...logs, ...chats]
      return merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    },
    // 暴露对话配置供模板使用
    firstLoginConfig() { return firstLoginDialogueConfig },
    // 当前讲述角色配置与名称
    narrationCharacterName() { return (this.getCurrentLanguage() === 'zh-CN') ? '美里' : 'Misato' },
    narrationCharacter() {
      const key = this.narrationCharacterName
      const chars = firstLoginDialogueConfig && firstLoginDialogueConfig.characters
      return (chars && chars[key]) ? chars[key] : { image: '/images/guide.png', position: 'right', color: '#3b82f6' }
    }
  },
  async mounted() {
    const roomId = this.$route.query.roomId
    if (roomId) this.$store.commit('SET_ROOM_ID', roomId)
    await this.initializeGame()
    await this.loadRoomState()
    // 立即初始化文物轮播数据，确保准备阶段就有内容
    await this.initializeArtifactCarousel()
    // loadRoomState 中已经调用了 loadAllPlayersArtifacts，这里确保数据加载
    await this.subscribeRoomRealtime()
    // 初始化音乐播放器
    this.initializeMusic()
  },
  beforeDestroy() {
    this.unsubscribeRoomRealtime()
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
    if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
    if (this.typingTimer) { clearInterval(this.typingTimer); this.typingTimer = null }
    if (this.carouselInterval) { clearInterval(this.carouselInterval); this.carouselInterval = null }
    // 清理音乐播放器
    this.cleanupMusic()
    this.$set(this, 'auctionCountdown', 0)
  },
  watch: {
    gameLog() {
      this.$nextTick(() => {
        const chatContainer = this.$refs.chatContainer
        if (chatContainer) { chatContainer.scrollTop = chatContainer.scrollHeight }
      })
    },
    // 监听游戏阶段变化，在准备阶段确保轮播数据存在
    gamePhase(newPhase) {
      if (newPhase === 'preparation') {
        this.$nextTick(() => {
          // 如果轮播数据为空，重新初始化
          if (!this.artifactCarouselData || this.artifactCarouselData.length === 0) {
            this.initializeArtifactCarousel()
          } else {
            // 数据已存在，只需确保轮播正常运行
            this.startAutoCarousel()
          }
        })
      } else {
        // 离开准备阶段时停止轮播
        this.stopAutoCarousel()
      }
      
      // 根据游戏阶段调整音乐播放
      this.handleGamePhaseMusic(newPhase)
    }
  },
  methods: {
    // 初始化文物轮播数据（改进版：确保总有内容显示）
    async initializeArtifactCarousel() {
      try {
        console.log('🧭 开始初始化文物轮播数据...')
        
        // 先检查是否有缓存的轮播数据
        if (this.artifactCarouselData && this.artifactCarouselData.length > 0) {
          console.log('📚 使用缓存轮播数据')
          this.startAutoCarousel()
          return
        }
        
        // 直接使用artifacts表获取数据
        const supabase = getSupabase()
        console.log('🔗 获取Supabase实例:', supabase ? '✅ 成功' : '❌ 失败')
        
        console.log('📥 正在从artifacts表获取数据...')
        const { data: artifactData, error: artifactError } = await supabase
          .from('artifacts')
          .select('id, name, era, location, image, base_value')
          .limit(10) // 获取10个文物用于轮播
          
        console.log('📊 从artifacts表获取数据结果:', {
          dataLength: artifactData ? artifactData.length : 0,
          error: artifactError,
          data: artifactData
        })
        
        let finalData = []
        
        if (artifactError) {
          console.error('❌ 从artifacts表获取文物数据失败:', artifactError)
          console.log('🔄 使用模拟数据作为备用...')
          finalData = this.getMockArtifactData()
        } else if (artifactData && artifactData.length > 0) {
          console.log('✅ 成功获取到文物数据:', artifactData.length, '条')
          // 处理真实数据
          finalData = artifactData.map((item, index) => {
            console.log(`📸 处理文物 ${index + 1}:`, item.name, '原始图片URL:', item.image)
            
            // 确保图片URL是完整的URL
            let imageUrl = item.image
            if (imageUrl) {
              if (imageUrl.startsWith('/')) {
                // 相对路径，转换为绝对路径
                console.log('🔄 转换相对路径为绝对路径...')
                if (imageUrl.startsWith('/static/')) {
                  // 静态资源路径，使用项目根路径
                  imageUrl = window.location.origin + imageUrl
                } else {
                  // 其他相对路径，使用Supabase存储路径
                  imageUrl = 'https://tgkzpywukorcwdsbfubw.supabase.co' + imageUrl
                }
              } else if (!imageUrl.startsWith('http')) {
                // 可能是相对路径但缺少斜杠
                console.log('🔄 处理可能缺少斜杠的路径...')
                imageUrl = 'https://tgkzpywukorcwdsbfubw.supabase.co/storage/v1/object/public/' + imageUrl
              }
            }
            
            const processedItem = {
              id: item.id,
              name: item.name,
              era: item.era,
              location: item.location,
              image: imageUrl || 'https://via.placeholder.com/400x300?text=文物预览',
              baseValue: item.base_value
            }
            
            console.log(`✅ 文物 ${index + 1} 处理完成 - 最终图片URL:`, processedItem.image)
            return processedItem
          })
        } else {
          console.log('📭 artifacts表为空，使用模拟数据')
          finalData = this.getMockArtifactData()
        }
        
        // 确保最终数据不为空
        if (finalData.length === 0) {
          console.log('⚠️ 最终数据为空，使用备用模拟数据')
          finalData = this.getMockArtifactData()
        }
        
        this.artifactCarouselData = finalData
        console.log('🎯 最终轮播数据:', this.artifactCarouselData.length, '条')
        console.log('🔄 开始自动轮播...')
        
        // 开始自动轮播
        this.startAutoCarousel()
      } catch (error) {
        console.error('💥 初始化文物轮播失败:', error)
        console.log('🔄 使用模拟数据作为最终备用...')
        // 确保即使出错也有数据展示
        this.artifactCarouselData = this.getMockArtifactData()
        this.startAutoCarousel()
      }
    },
    
    // 获取模拟文物数据（备用方案）
    getMockArtifactData() {
      return [
        {
          id: 'artifact_001',
          name: '唐代秘色瓷',
          era: '唐代',
          location: '中国',
          image: 'https://via.placeholder.com/400x300/f0f0f0/666666?text=唐代秘色瓷',
          baseValue: 8
        },
        {
          id: 'artifact_002',
          name: '达芬奇奇设图',
          era: '文艺复兴',
          location: '意大利',
          image: 'https://via.placeholder.com/400x300/f0f0f0/666666?text=达芬奇奇设图',
          baseValue: 9
        },
        {
          id: 'artifact_003',
          name: '琥珀化石',
          era: '史前',
          location: '波罗的海',
          image: 'https://via.placeholder.com/400x300/f0f0f0/666666?text=琥珀化石',
          baseValue: 6
        },
        {
          id: 'artifact_004',
          name: '维京龙头船',
          era: '维京时代',
          location: '北欧',
          image: 'https://via.placeholder.com/400x300/f0f0f0/666666?text=维京龙头船',
          baseValue: 7
        },
        {
          id: 'artifact_005',
          name: '星盘仪',
          era: '中世纪',
          location: '阿拉伯',
          image: 'https://via.placeholder.com/400x300/f0f0f0/666666?text=星盘仪',
          baseValue: 7
        }
      ]
    },
    
    // 开始自动轮播
    startAutoCarousel() {
      if (this.carouselInterval) {
        clearInterval(this.carouselInterval)
      }
      
      // 确保有数据才开启轮播
      if (!this.artifactCarouselData || this.artifactCarouselData.length === 0) {
        console.log('⚠️ 轮播数据为空，不启动自动轮播')
        return
      }
      
      this.carouselInterval = setInterval(() => {
        this.nextSlide()
      }, 3000) // 每3秒自动切换
    },
    
    // 停止自动轮播
    stopAutoCarousel() {
      if (this.carouselInterval) {
        clearInterval(this.carouselInterval)
        this.carouselInterval = null
      }
    },
    
    // 下一张幻灯片
    nextSlide() {
      if (this.artifactCarouselData && this.artifactCarouselData.length > 0) {
        this.currentSlide = (this.currentSlide + 1) % this.artifactCarouselData.length
      }
    },
    
    // 上一张幻灯片
    prevSlide() {
      if (this.artifactCarouselData && this.artifactCarouselData.length > 0) {
        this.currentSlide = (this.currentSlide - 1 + this.artifactCarouselData.length) % this.artifactCarouselData.length
      }
    },
    
    // 跳转到指定幻灯片
    goToSlide(index) {
      if (this.artifactCarouselData && index >= 0 && index < this.artifactCarouselData.length) {
        this.currentSlide = index
      }
    },
    
    // 处理图片加载错误
    handleImageError(artifact) {
      console.warn(`文物图片加载失败: ${artifact.name}`)
      // 可以设置默认图片或使用占位符
      artifact.image = 'https://via.placeholder.com/400x300?text=文物预览'
    },

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
            
            // 新局开始：重置聊天消息和价值数据
            this.chatMessages = []
            this.allPlayersArtifacts = {}
            // 重置回合数
            this.$store.commit('RESET_ROUND')
            this.$store.commit('SET_ROUND_TOTAL', 6)
            
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
          onAuctionStarted: async (duration, payload) => { 
            // 确保所有玩家都能看到拍卖数据
            await this.loadRoomState()
            
            // 同步回合数（如果广播中包含了回合信息）
            if (payload && typeof payload.roundCurrent === 'number') {
              this.$store.commit('SET_ROUND_CURRENT', payload.roundCurrent)
            }
            if (payload && typeof payload.roundTotal === 'number') {
              this.$store.commit('SET_ROUND_TOTAL', payload.roundTotal)
            }
            
            this.startAuctionTimer(duration) 
          },
          onBidUpdate: ({ auctionId, highestBid, highestBidder }) => {
            if (!auctionId) return
            const list = this.$store.state.currentAuctions || []
            const idx = list.findIndex(a => a.id === auctionId)
            if (idx >= 0) {
              const next = { ...list[idx], highestBid, highestBidder }
              this.$store.commit('ADD_OR_UPDATE_AUCTION', next)
            }
          },
          // 旧回合广播已移除，统一本地推进，不再接收该事件
          onRoundUpdated: (_data) => {},
          onGameEnded: () => {
            this.$store.commit('SET_GAME_PHASE', 'settlement')
        this.computeFinalScores().finally(() => { this.showGameEndDialog = true })
            if (this.auctionTimer) { clearInterval(this.auctionTimer); this.auctionTimer = null }
          },
          onAuctionEnded: async () => { await this.loadRoomState() },
          onChatMessage: (message) => {
            // 避免重复添加消息
            if (!message || !message.id) return
            const existing = this.chatMessages.find(m => m.id === message.id || (m.userId === message.userId && m.timestamp === message.timestamp && m.content === message.content))
            if (existing) return
            
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
      // 加载所有玩家的手牌数据，用于价值计算
      await this.loadAllPlayersArtifacts()
      // 如果刷新后发现仍有活跃拍卖，但本地无倒计时，则用当前剩余时间启动统一倒计时
      const auctions = this.$store.state.currentAuctions || []
      if (this.$store.state.gamePhase === 'auction' && auctions.length > 0) {
        const remaining = Number(this.auctionCountdown || 0)
        if (!this.auctionTimer && remaining > 0) {
          startCountdown({
            seconds: remaining,
            onTick: (s) => { this.$set(this, 'auctionCountdown', s); },
            onDone: async () => { await this.onAuctionTimeUp() },
            getRef: () => this.auctionTimer,
            setRef: (id) => { this.auctionTimer = id },
          })
        }
      }
    },
    
    // 加载所有玩家的手牌数据
    async loadAllPlayersArtifacts() {
      try {
        const rid = this.$store.state.roomId
        if (!rid) {
          this.allPlayersArtifacts = {}
          return
        }
        
        const supabase = getSupabase()
        // 获取房间内所有玩家的手牌数据
        const { data: allArtifacts } = await supabase
          .from('room_artifacts')
          .select('owner_user_id, artifact_id')
          .eq('room_id', rid)
        
        // 按玩家ID分组
        const playerArtifactsMap = {}
        if (allArtifacts && allArtifacts.length > 0) {
          allArtifacts.forEach(row => {
            const userId = row.owner_user_id
            if (!playerArtifactsMap[userId]) {
              playerArtifactsMap[userId] = []
            }
            playerArtifactsMap[userId].push(row.artifact_id)
          })
        }
        
        // 使用 Vue.set 确保响应式更新
        this.$set(this, 'allPlayersArtifacts', playerArtifactsMap)
      } catch (e) {
        console.warn('[game] loadAllPlayersArtifacts failed', e)
        this.allPlayersArtifacts = {}
      }
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

    // 音乐控制相关方法
    initializeMusic() {
      try {
        // 创建音频元素
        this.audioElement = new Audio('/images/bgm.mp3')
        this.audioElement.loop = true
        this.audioElement.volume = this.musicVolume
        
        // 监听音频播放状态
        this.audioElement.addEventListener('loadeddata', () => {
          console.log('🎵 背景音乐加载完成')
        })
        
        this.audioElement.addEventListener('error', (e) => {
          console.error('🎵 背景音乐加载失败:', e)
        })
        
        // 尝试自动播放（需要用户交互后才能生效）
        this.audioElement.load()
      } catch (error) {
        console.error('🎵 初始化音乐播放器失败:', error)
      }
    },
    
    toggleMusic() {
      if (!this.audioElement) return
      
      if (this.isMusicPlaying) {
        this.pauseMusic()
      } else {
        this.playMusic()
      }
    },
    
    async playMusic() {
      if (!this.audioElement) return
      
      try {
        await this.audioElement.play()
        this.isMusicPlaying = true
        console.log('🎵 背景音乐开始播放')
      } catch (error) {
        console.warn('🎵 音乐播放失败，可能需要用户交互:', error)
        // 如果是自动播放策略导致的失败，我们仍将状态标记为播放
        this.isMusicPlaying = true
      }
    },
    
    pauseMusic() {
      if (!this.audioElement) return
      
      this.audioElement.pause()
      this.isMusicPlaying = false
      console.log('🎵 背景音乐暂停')
    },
    
    setVolume(volume) {
      this.musicVolume = Math.max(0, Math.min(1, volume))
      if (this.audioElement) {
        this.audioElement.volume = this.musicVolume
      }
    },
    
    cleanupMusic() {
      if (this.audioElement) {
        this.pauseMusic()
        this.audioElement = null
      }
    },
    
    // 根据游戏阶段处理音乐播放
    handleGamePhaseMusic(phase) {
      if (!this.audioElement) return
      
      // 只有在音乐正在播放时才需要根据阶段调整
      if (!this.isMusicPlaying) return
      
      switch (phase) {
        case 'preparation':
          // 准备阶段：正常播放
          this.setVolume(0.5)
          break
        case 'countdown':
        case 'intermission':
          // 倒计时和间歇阶段：降低音量
          this.setVolume(0.3)
          break
        case 'auction':
          // 拍卖阶段：正常音量
          this.setVolume(0.5)
          break
        case 'item':
          // 道具阶段：稍微降低音量
          this.setVolume(0.4)
          break
        case 'settlement':
          // 结算阶段：降低音量
          this.setVolume(0.3)
          break
        default:
          this.setVolume(0.5)
      }
    },

    // 音乐控制相关方法
    initializeMusic() {
      try {
        // 创建音频元素
        this.audioElement = new Audio('/images/bgm.mp3')
        this.audioElement.loop = true
        this.audioElement.volume = this.musicVolume
        
        // 监听音频播放状态
        this.audioElement.addEventListener('loadeddata', () => {
          console.log('🎵 背景音乐加载完成')
        })
        
        this.audioElement.addEventListener('error', (e) => {
          console.error('🎵 背景音乐加载失败:', e)
        })
        
        // 尝试自动播放（需要用户交互后才能生效）
        this.audioElement.load()
      } catch (error) {
        console.error('🎵 初始化音乐播放器失败:', error)
      }
    },
    
    toggleMusic() {
      if (!this.audioElement) return
      
      if (this.isMusicPlaying) {
        this.pauseMusic()
      } else {
        this.playMusic()
      }
    },
    
    async playMusic() {
      if (!this.audioElement) return
      
      try {
        await this.audioElement.play()
        this.isMusicPlaying = true
        console.log('🎵 背景音乐开始播放')
      } catch (error) {
        console.warn('🎵 音乐播放失败，可能需要用户交互:', error)
        // 如果是自动播放策略导致的失败，我们仍将状态标记为播放
        this.isMusicPlaying = true
      }
    },
    
    pauseMusic() {
      if (!this.audioElement) return
      
      this.audioElement.pause()
      this.isMusicPlaying = false
      console.log('🎵 背景音乐暂停')
    },
    
    setVolume(volume) {
      this.musicVolume = Math.max(0, Math.min(1, volume))
      if (this.audioElement) {
        this.audioElement.volume = this.musicVolume
      }
    },
    
    cleanupMusic() {
      if (this.audioElement) {
        this.pauseMusic()
        this.audioElement = null
      }
    },
    
    // 根据游戏阶段处理音乐播放
    handleGamePhaseMusic(phase) {
      if (!this.audioElement) return
      
      // 只有在音乐正在播放时才需要根据阶段调整
      if (!this.isMusicPlaying) return
      
      switch (phase) {
        case 'preparation':
          // 准备阶段：正常播放
          this.setVolume(0.5)
          break
        case 'countdown':
        case 'intermission':
          // 倒计时和间歇阶段：降低音量
          this.setVolume(0.3)
          break
        case 'auction':
          // 拍卖阶段：正常音量
          this.setVolume(0.5)
          break
        case 'item':
          // 道具阶段：稍微降低音量
          this.setVolume(0.4)
          break
        case 'settlement':
          // 结算阶段：降低音量
          this.setVolume(0.3)
          break
        default:
          this.setVolume(0.5)
      }
    },
    async startGame() {
      try {
        const rid = this.$store.state.roomId
        const uid = this.$store.state.user && this.$store.state.user.id
        if (!rid || !uid || !this.isOwner || !this.allReady) return
        // 新局开始前重置系统日志、聊天消息和价值数据
        try { this.$store.commit('CLEAR_GAME_LOG') } catch (_) {}
        this.chatMessages = []
        this.allPlayersArtifacts = {}
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
          // 确保本地也重置数据
          this.chatMessages = []
          this.allPlayersArtifacts = {}
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
      this.$store.commit('SET_SHOW_CARD_DETAIL', false)
      this.openNarration()
    },
    // 计算玩家总价值（支持所有玩家）
    getPlayerTotalValue(userId) {
      if (!userId) return 0
      
      // 优先从 allPlayersArtifacts 获取所有玩家的手牌数据
      let owned = []
      if (this.allPlayersArtifacts && this.allPlayersArtifacts[userId]) {
        owned = Array.isArray(this.allPlayersArtifacts[userId]) ? this.allPlayersArtifacts[userId] : []
      } else {
        // 回退：如果 allPlayersArtifacts 中没有，尝试从当前玩家数据获取
        const current = this.$store.state.currentPlayer
        if (current && current.id === userId) {
          owned = Array.isArray(this.$store.state.playerArtifacts) ? this.$store.state.playerArtifacts : []
        }
      }
      
      if (!owned || owned.length === 0) return 0
      
      // 确保 artifactMap 已加载
      if (!this.artifactMap || Object.keys(this.artifactMap).length === 0) return 0
      
      let total = 0
      owned.forEach(aid => {
        const a = this.artifactMap[aid]
        if (a && typeof a.baseValue === 'number') {
          total += a.baseValue
        }
      })
      return total
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
    
    
    getAvatarFor(userId) { return getAvatarForHelper({ profileMap: this.profileMap, userId }) },
    getNameFor(userId) { return getNameForHelper({ profileMap: this.profileMap, room: this.room, userId }) },
    getCurrentLanguage() { return getCurrentLanguageImported() },
    
    // 加载收藏集数据：基于数据库 artifacts 的 collection_tags 动态生成
    async loadCollections() {
      try { this.collections = loadCollectionsFromArtifacts(this.artifactMap) }
      catch (error) { console.error('加载收藏集数据失败:', error); this.collections = [] }
    },
    
   
    
    // 获取当前收藏集数量（基于当前用户手牌，且受最大要求数上限限制）
    getCurrentCollectionCount(collection) {
      const owned = (this.currentPlayer && this.currentPlayer.artifacts) ? this.currentPlayer.artifacts : []
      return getCollectionCountUtil({ artifactMap: this.artifactMap, ownedArtifactIds: owned, collection })
    },


    // 展开/收起收藏集
    toggleCollection(collection) {
      const id = collection && collection.id
      if (!id) return
      this.$set(this.expandedCollections, id, !this.expandedCollections[id])
    },
    
    // 关闭游戏结束对话框
    closeGameEndDialog() {
      this.showGameEndDialog = false
    },
    
    // 留在房间
    stayInRoom() {
      this.showGameEndDialog = false
      try { this.$store.commit('CLEAR_GAME_LOG') } catch (_) {}
      // 返回当前房间准备界面
      const rid = this.$store.state.roomId
      if (rid) {
        this.$store.commit('SET_GAME_PHASE', 'preparation')
        this.$router.push({ path: '/game', query: { roomId: rid } })
      }
    },
    
    // 返回房间列表
    goToRooms() {
      this.showGameEndDialog = false
      this.unsubscribeRoomRealtime()
      try { this.$store.commit('CLEAR_GAME_LOG') } catch (_) {}
      // 返回当前房间准备界面（更符合期望）
      const rid = this.$store.state.roomId
      if (rid) {
        this.$store.commit('SET_GAME_PHASE', 'preparation')
        this.$router.push({ path: '/game', query: { roomId: rid } })
      } else {
        this.$router.push('/rooms')
      }
    },
    
    // 时间到：结束当前所有拍卖并结算到对应玩家手牌，然后进入10s间歇或结束游戏
    async onAuctionTimeUp() {
      try {
        const auctions = this.$store.state.currentAuctions || []
        // 统一倒计时结束：结束所有当前拍卖
        for (const a of auctions) {
          await this.$store.dispatch('endAuction', a.id)
        }
        // 判断是否达到总回合数
        const cur = Number(this.$store.state.roundCurrent || 0)
        const tot = Number(this.$store.state.roundTotal || 6)
        if (cur >= tot) {
          // 触发结束
          this.$store.commit('SET_GAME_PHASE', 'settlement')
          await this.computeFinalScores()
          this.showGameEndDialog = true
          return
        }
        // 否则进入10s间歇阶段
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
      const message = { 
        id: Date.now(), 
        userId: this.user.id, 
        username: this.getNameFor(this.user.id), 
        content: this.newMessage.trim(), 
        timestamp: Date.now() 
      }
      // 本地立即显示，提供即时反馈
      this.chatMessages.push(message)
      this.newMessage = ''
      
      // 滚动到底部
      this.$nextTick(() => {
        const chatContainer = this.$refs.chatContainer
        if (chatContainer) { chatContainer.scrollTop = chatContainer.scrollHeight }
      })
      
      // 发送到服务器，广播给所有玩家
      const rid = this.$store.state.roomId
      if (rid) { 
        try { 
          const supabase = getSupabase()
          await sendChatMessage({ supabase, roomId: rid, message }) 
        } catch (e) { 
          console.warn('[game] sendMessage failed', e)
          // 发送失败时，可以选择移除本地消息或保留（保留提供更好的用户体验）
        } 
      }
    },
    
    // 格式化消息时间
    formatMessageTime(timestamp) { return formatMessageTimeHelper(timestamp) }
    ,

    // 计算最终得分并确定赢家
    async computeFinalScores() {
      try {
        const rid = this.$store.state.roomId
        if (!rid) return
        const supabase = getSupabase()
        const { data: rows } = await supabase
          .from('room_artifacts')
          .select('owner_user_id, artifact_id')
          .eq('room_id', rid)
        const userToArtifacts = {}
        ;(rows || []).forEach(r => {
          if (!userToArtifacts[r.owner_user_id]) userToArtifacts[r.owner_user_id] = []
          userToArtifacts[r.owner_user_id].push(r.artifact_id)
        })

        const collections = Array.isArray(this.collections) ? this.collections : []
        const scores = Object.keys(userToArtifacts).map(uid => {
          const owned = userToArtifacts[uid]
          // 收藏集分数
          let collectionScore = 0
          collections.forEach(col => {
            const current = getCollectionCountUtil({ artifactMap: this.artifactMap, ownedArtifactIds: owned, collection: col })
            if (current >= (col.requiredCount || 1)) collectionScore += (col.rewardPoints || 0)
          })
          // 零散奇物分数（基础价值一半，向下取整）
          let artifactScore = 0
          owned.forEach(aid => {
            const a = this.artifactMap[aid]
            if (a && typeof a.baseValue === 'number') artifactScore += Math.floor(a.baseValue / 2)
          })
        
          const total = collectionScore + artifactScore
          return {
            userId: uid,
            name: this.getNameFor(uid),
            avatar: this.getAvatarFor(uid),
            collectionScore,
            artifactScore,
            total
          }
        })

        const sorted = scores.sort((a, b) => b.total - a.total)
        this.finalScores = sorted
        this.winnerInfo = sorted[0] || null

        if (this.winnerInfo) {
          this.$store.commit('ADD_GAME_LOG', { timestamp: Date.now(), message: `本局结束，胜者：${this.winnerInfo.name}（总分 ${this.winnerInfo.total}）` })
        }
      } catch (e) { console.warn('[game] computeFinalScores failed', e) }
    },

    // 开启/关闭文物讲述
    openNarration() {
      // 构造讲述文本，包含基本介绍 + 故事
      const base = `${this.selectedCard.name}，来自 ${this.selectedCard.era}${this.selectedCard.location ? ' · ' + this.selectedCard.location : ''}。\n`
      const story = (this.selectedCard.story || '').trim()
      const full = `${base}${story}`.trim()
      // 打字机效果
      this.typingText = ''
      this.showNarration = true
      const speed = (firstLoginDialogueConfig && firstLoginDialogueConfig.animations && firstLoginDialogueConfig.animations.textTypingSpeed) || 30
      if (this.typingTimer) { clearInterval(this.typingTimer); this.typingTimer = null }
      let i = 0
      this.typingTimer = setInterval(() => {
        if (i >= full.length) {
          clearInterval(this.typingTimer)
          this.typingTimer = null
        } else {
          this.typingText += full[i]
          i += 1
        }
      }, speed)
    },
    closeNarration() {
      if (this.typingTimer) { clearInterval(this.typingTimer); this.typingTimer = null }
      this.showNarration = false
      this.typingText = ''
    }
  }
}
</script>

<style lang="scss" scoped src="./index.scss"></style>