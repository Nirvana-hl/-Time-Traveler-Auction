<template>
  <div class="rooms-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-content">
        <div class="brand">
          <div class="brand-icon">🏠</div>
          <span class="brand-text">房间列表</span>
        </div>
        <div class="nav-actions">
          <button class="nav-btn" @click="$router.push('/create-room')">
            <span class="btn-icon">➕</span>
            创建房间
          </button>
          <button class="nav-btn" @click="$router.push('/menu')">
            <span class="btn-icon">←</span>
            返回菜单
          </button>
        </div>
      </div>
    </nav>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 页面标题 -->
      <section class="header-section">
        <div class="section-header">
          <h1 class="section-title">选择房间加入</h1>
          <p class="section-subtitle">浏览可用房间或通过ID直接加入</p>
        </div>
      </section>

      <!-- 快速加入区域 -->
      <section class="quick-join-section">
        <div class="quick-join-card">
          <div class="card-header">
            <div class="card-icon">🔢</div>
            <h2 class="card-title">快速加入</h2>
            <p class="card-subtitle">输入房间ID直接加入指定房间</p>
          </div>
          <div class="card-content">
            <div class="input-group">
              <div class="input-icon">🏠</div>
              <input 
                v-model="roomIdInput" 
                type="text" 
                placeholder="输入房间ID（支持6位数字或完整UUID）"
                class="room-input"
                @keyup.enter="joinById"
              />
              <button class="input-btn" @click="joinById" :disabled="!roomIdInput">
                加入
              </button>
            </div>
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          </div>
        </div>
      </section>

      <!-- 房间列表区域 -->
      <section class="rooms-section">
        <div class="section-header">
          <h2 class="section-title">可用房间</h2>
          <p class="section-subtitle">{{ rooms.length }} 个房间可用</p>
        </div>

        <div v-if="rooms && rooms.length" class="rooms-grid">
          <div 
            v-for="room in rooms" 
            :key="room.id" 
            class="room-card"
            :class="{ 'selected': selectedRoomId === room.id }"
            @click="selectRoom(room.id)"
          >
            <div class="room-header">
              <div class="room-icon">🏠</div>
              <div class="room-info">
                <h3 class="room-name">{{ room.name || ('房间' + (room.short_id || room.id.slice(0,8))) }}</h3>
                <div class="room-id">ID: {{ room.short_id || room.id.slice(0,8) }}</div>
              </div>
              <div class="room-status" :class="room.status">
                <span class="status-dot"></span>
                {{ getStatusText(room.status) }}
              </div>
            </div>

            <div class="room-details">
              <div class="detail-item">
                <span class="detail-icon">👥</span>
                <span class="detail-label">人数</span>
                <span class="detail-value">{{ (room.current_players != null ? room.current_players : 0) }}/{{ room.max_players }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">🕒</span>
                <span class="detail-label">创建时间</span>
                <span class="detail-value">{{ formatTime(room.created_at) }}</span>
              </div>
            </div>

            <div class="room-actions">
              <button 
                class="join-btn" 
                @click.stop="selectedRoomId === room.id ? joinSelectedRoom() : selectRoom(room.id)"
                :disabled="room.status !== 'waiting'"
              >
                <span class="btn-icon">🚪</span>
                {{ selectedRoomId === room.id ? '加入房间' : '选择房间' }}
              </button>
      </div>
      </div>
      </div>

        <div v-else class="empty-state">
          <div class="empty-icon">🏠</div>
          <h3 class="empty-title">暂无可用房间</h3>
          <p class="empty-subtitle">当前没有等待中的房间，你可以创建一个新房间</p>
          <button class="empty-action" @click="$router.push('/create-room')">
            <span class="btn-icon">➕</span>
            创建房间
          </button>
    </div>
      </section>
    </main>
  </div>
</template>

<script>
import roomService from '../../services/room-service'
import authService from '../../services/auth-service'

export default {
  name: 'RoomsPage',
  data() {
    return {
      rooms: [],
      selectedRoomId: '',
      roomIdInput: '',
      errorMessage: '',
      refreshTimer: null
    }
  },
  async mounted() {
    const user = await authService.getUser()
    if (user) this.$store.commit('SET_USER', user)
    this.refreshTimer = setInterval(this.loadRooms, 5000)
    await this.loadRooms()
  },
  beforeDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
  },
  methods: {
    async loadRooms() {
      try {
        this.rooms = await roomService.listRooms()
      } catch (_) {}
    },
    selectRoom(id) { 
      this.selectedRoomId = id 
    },
    async joinSelectedRoom() {
      try {
        const user = this.$store.state.user
        console.log('[rooms.vue] joinSelectedRoom clicked', { selectedRoomId: this.selectedRoomId, userId: user && user.id })
        if (!user) return this.$router.push('/login')
        if (!this.selectedRoomId) throw new Error('请选择房间')
        const room = await roomService.joinRoom(this.selectedRoomId, user.id)
        console.log('[rooms.vue] joinSelectedRoom success', { roomId: room && room.id })
        this.$store.commit('SET_ROOM_ID', room.id)
        this.$router.push({ path: '/game', query: { roomId: room.id } })
      } catch (e) {
        console.error('[rooms] joinSelectedRoom error', e)
        this.errorMessage = e.message || '加入房间失败'
      }
    },
    async joinById() {
      try {
        const user = this.$store.state.user
        console.log('[rooms.vue] joinById clicked', { input: this.roomIdInput, userId: user && user.id })
        if (!user) return this.$router.push('/login')
        if (!this.roomIdInput) throw new Error('请填写房间ID')
        const room = await roomService.joinRoom(this.roomIdInput, user.id)
        console.log('[rooms.vue] joinById success', { roomId: room && room.id })
        this.$store.commit('SET_ROOM_ID', room.id)
        this.$router.push({ path: '/game', query: { roomId: room.id } })
      } catch (e) {
        console.error('[rooms] joinById error', e)
        this.errorMessage = e.message || '加入房间失败'
      }
    },
    getStatusText(status) {
      const statusMap = {
        'waiting': '等待中',
        'playing': '游戏中',
        'ended': '已结束'
      }
      return statusMap[status] || status
    },
    formatTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return `${Math.floor(diff / 60000)}分钟前`
      } else if (diff < 86400000) { // 1天内
        return `${Math.floor(diff / 3600000)}小时前`
      } else {
        return date.toLocaleDateString('zh-CN')
      }
    }
  }
}
</script>

<style scoped>
.rooms-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  color: #e2e8f0;
}

/* 导航栏样式 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  font-size: 24px;
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

/* 主要内容区域 */
.main-content {
  padding-top: 64px;
}

/* 页面标题区域 */
.header-section {
  padding: 60px 24px 40px;
  text-align: center;
}

.section-header {
  max-width: 800px;
  margin: 0 auto;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #94a3b8;
}

/* 快速加入区域 */
.quick-join-section {
  padding: 0 24px 40px;
  max-width: 800px;
  margin: 0 auto;
}

.quick-join-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.card-header {
  text-align: center;
  margin-bottom: 24px;
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.card-subtitle {
  color: #94a3b8;
}

.card-content {
  max-width: 500px;
  margin: 0 auto;
}

.input-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 4px;
  transition: all 0.3s ease;
}

.input-group:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-icon {
  padding: 0 16px;
  font-size: 1.25rem;
}

.room-input {
  flex: 1;
  padding: 16px;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 16px;
  outline: none;
}

.room-input::placeholder {
  color: #64748b;
}

.input-btn {
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.input-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.input-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #fca5a5;
  text-align: center;
  margin-top: 16px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
}

/* 房间列表区域 */
.rooms-section {
  padding: 40px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.room-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.room-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.room-card.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.room-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.room-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.room-info {
  flex: 1;
}

.room-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: #e2e8f0;
}

.room-id {
  font-size: 0.875rem;
  color: #94a3b8;
  font-family: 'Courier New', monospace;
}

.room-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.room-status.waiting {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.room-status.playing {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.room-status.ended {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.room-details {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.detail-icon {
  font-size: 1rem;
}

.detail-label {
  color: #94a3b8;
}

.detail-value {
  color: #e2e8f0;
  font-weight: 500;
}

.room-actions {
  text-align: center;
}

.join-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.join-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.join-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #e2e8f0;
}

.empty-subtitle {
  color: #94a3b8;
  margin-bottom: 32px;
  font-size: 1.125rem;
}

.empty-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.empty-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .section-title {
    font-size: 2rem;
  }
  
  .rooms-grid {
    grid-template-columns: 1fr;
  }
  
  .nav-actions {
    gap: 8px;
  }
  
  .nav-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .room-details {
    flex-direction: column;
    gap: 8px;
  }
}
</style>