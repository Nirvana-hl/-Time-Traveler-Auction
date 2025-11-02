<template>
  <div class="create-room-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-content">
        <div class="brand">
          <div class="brand-icon">🏠</div>
          <span class="brand-text">创建房间</span>
        </div>
        <div class="nav-actions">
          <button v-if="currentRoom" class="nav-btn" @click="$router.push('/rooms')">
            <span class="btn-icon">🏠</span>
            返回房间列表
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
      <!-- 创建房间表单 -->
      <section class="create-section">
        <div class="section-header">
          <h1 class="section-title">创建新房间</h1>
          <p class="section-subtitle">设置房间信息，邀请朋友一起游戏</p>
        </div>

        <div class="form-container">
          <div class="form-card">
            <div class="form-header">
              <div class="form-icon">⚙️</div>
              <h2 class="form-title">房间设置</h2>
      </div>

            <div class="form-content">
        <div class="form-field">
                <label class="field-label">
                  <span class="label-icon">🏷️</span>
                  房间名称
                </label>
                <input 
                  v-model="name" 
                  type="text" 
                  placeholder="例如：时空拍卖-1号房"
                  class="form-input"
                />
                <p class="field-hint">给你的房间起个有趣的名字</p>
        </div>

        <div class="form-field">
                <label class="field-label">
                  <span class="label-icon">👥</span>
                  最大人数
                </label>
                <div class="number-input-group">
                  <button class="number-btn" @click="decreasePlayers" :disabled="maxPlayers <= 2">-</button>
                  <input 
                    v-model.number="maxPlayers" 
                    type="number" 
                    min="2" 
                    max="8"
                    class="number-input"
                    readonly
                  />
                  <button class="number-btn" @click="increasePlayers" :disabled="maxPlayers >= 8">+</button>
                </div>
                <p class="field-hint">2-8人，推荐4-6人</p>
        </div>

        <div class="form-field">
                <label class="field-label">
                  <span class="label-icon">📝</span>
                  房间描述
                </label>
                <textarea 
                  v-model="description" 
                  placeholder="写点房间特色或规则..."
                  class="form-textarea"
                  rows="3"
                ></textarea>
                <p class="field-hint">可选，描述房间的特色或特殊规则</p>
        </div>
      </div>

            <div class="form-actions">
              <button class="create-btn" @click="handleCreate" :disabled="isCreating">
                <span v-if="isCreating" class="btn-spinner"></span>
                <span class="btn-icon">🚀</span>
                {{ isCreating ? '创建中...' : '创建房间' }}
              </button>
            </div>

            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </div>
        </div>
      </section>

      <!-- 房间创建成功 -->
      <section v-if="room" class="success-section">
        <div class="success-card">
          <div class="success-header">
            <div class="success-icon">🎉</div>
            <h2 class="success-title">房间创建成功！</h2>
            <p class="success-subtitle">你的房间已经准备就绪</p>
          </div>

          <div class="room-info">
            <div class="info-item">
              <div class="info-label">房间名称</div>
              <div class="info-value">{{ room.name || '未命名房间' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">房间ID</div>
              <div class="info-value room-id">{{ room.short_id }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">最大人数</div>
              <div class="info-value">{{ room.max_players }}人</div>
            </div>
            <div class="info-item" v-if="room.description">
              <div class="info-label">房间描述</div>
              <div class="info-value">{{ room.description }}</div>
        </div>
      </div>

          <div class="invite-section">
            <h3 class="invite-title">邀请朋友</h3>
            <div class="invite-methods">
              <div class="invite-method">
                <div class="method-icon">🔢</div>
                <div class="method-content">
                  <div class="method-label">房间ID</div>
                  <div class="method-value">{{ room.short_id }}</div>
                  <button class="copy-btn" @click="copyRoomId">复制</button>
                </div>
      </div>
              <div class="invite-method">
                <div class="method-icon">🔗</div>
                <div class="method-content">
                  <div class="method-label">邀请链接</div>
                  <div class="method-value link">{{ inviteLink }}</div>
                  <button class="copy-btn" @click="copyInviteLink">复制</button>
        </div>
      </div>
    </div>
          </div>

          <div class="success-actions">
            <button class="action-btn primary" @click="$router.push({ path: '/game', query: { roomId: room.id } })">
              <span class="btn-icon">🚪</span>
              进入房间
            </button>
            <button class="action-btn secondary" @click="copyAllInfo">
              <span class="btn-icon">📋</span>
              复制全部信息
            </button>
      </div>
    </div>
      </section>
    </main>
  </div>
</template>

<script>
import roomService from '../../services/room-service'
import authService from '../../services/auth-service'

export default {
  name: 'CreateRoomPage',
  data() {
    return {
      name: '',
      maxPlayers: 6,
      description: '',
      errorMessage: '',
      room: null,
      inviteLink: '',
      isCreating: false,
      currentRoom: null
    }
  },
  async mounted() {
    const user = await authService.getUser()
    if (user) {
      this.$store.commit('SET_USER', user)
      // 检查用户是否已经在房间中
      await this.loadCurrentRoom()
    } else {
      this.$router.push('/login')
    }
  },
  methods: {
    async loadCurrentRoom() {
      try {
        const roomId = this.$store.state.roomId
        if (roomId) {
          this.currentRoom = await roomService.getRoom(roomId)
        }
      } catch (e) {
        console.warn('[create-room] loadCurrentRoom failed', e)
        this.currentRoom = null
      }
    },
    decreasePlayers() {
      if (this.maxPlayers > 2) {
        this.maxPlayers--
      }
    },
    increasePlayers() {
      if (this.maxPlayers < 8) {
        this.maxPlayers++
      }
    },
    async handleCreate() {
      this.errorMessage = ''
      this.isCreating = true
      
      try {
        const user = this.$store.state.user
        if (!user) return this.$router.push('/login')
        
        const room = await roomService.createRoom(user.id, { 
          name: this.name, 
          maxPlayers: this.maxPlayers, 
          description: this.description 
        })
        
        this.room = room
        this.$store.commit('SET_ROOM_ID', room.id)
        this.inviteLink = `${window.location.origin}/game?roomId=${room.id}`
        
        // 滚动到成功区域
        this.$nextTick(() => {
          const successSection = document.querySelector('.success-section')
          if (successSection) {
            successSection.scrollIntoView({ behavior: 'smooth' })
          }
        })
        
      } catch (e) {
        this.errorMessage = e.message || '创建房间失败'
      } finally {
        this.isCreating = false
      }
    },
    async copyRoomId() {
      try {
        await navigator.clipboard.writeText(this.room.short_id)
        this.showCopySuccess('房间ID已复制')
      } catch (e) {
        console.error('复制失败:', e)
      }
    },
    async copyInviteLink() {
      try {
        await navigator.clipboard.writeText(this.inviteLink)
        this.showCopySuccess('邀请链接已复制')
      } catch (e) {
        console.error('复制失败:', e)
      }
    },
    async copyAllInfo() {
      const text = `房间名称：${this.room.name || '未命名房间'}
房间ID：${this.room.short_id}
最大人数：${this.room.max_players}人
${this.room.description ? `房间描述：${this.room.description}` : ''}
邀请链接：${this.inviteLink}`
      
      try {
        await navigator.clipboard.writeText(text)
        this.showCopySuccess('全部信息已复制')
      } catch (e) {
        console.error('复制失败:', e)
      }
    },
    showCopySuccess(message) {
      // 简单的成功提示
      const toast = document.createElement('div')
      toast.textContent = message
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      `
      document.body.appendChild(toast)
      setTimeout(() => {
        document.body.removeChild(toast)
      }, 3000)
    }
  }
}
</script>

<style scoped>
.create-room-container {
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
  gap: 16px;
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

/* 创建房间区域 */
.create-section {
  padding: 80px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 16px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-subtitle {
  font-size: 1.25rem;
  color: #94a3b8;
}

.form-container {
  display: flex;
  justify-content: center;
}

.form-card {
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-content {
  margin-bottom: 32px;
}

.form-field {
  margin-bottom: 24px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.label-icon {
  font-size: 16px;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 16px;
  outline: none;
  transition: all 0.3s ease;
}

.form-input:focus, .form-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.field-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.number-input-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.number-btn {
  padding: 16px 20px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.number-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.number-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.number-input {
  flex: 1;
  padding: 16px;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 16px;
  text-align: center;
  outline: none;
}

.form-actions {
  text-align: center;
}

.create-btn {
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
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
}

.create-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

/* 成功区域 */
.success-section {
  padding: 40px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.success-card {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
}

.success-header {
  margin-bottom: 32px;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.success-title {
  font-size: 2rem;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 8px;
}

.success-subtitle {
  color: #94a3b8;
  font-size: 1.125rem;
}

.room-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.info-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.info-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
}

.room-id {
  font-family: 'Courier New', monospace;
  background: rgba(59, 130, 246, 0.2);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
}

.invite-section {
  margin-bottom: 32px;
}

.invite-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.invite-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.invite-method {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
}

.method-icon {
  font-size: 1.5rem;
}

.method-content {
  flex: 1;
}

.method-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.method-value {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
  word-break: break-all;
}

.method-value.link {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.copy-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-btn:hover {
  background: rgba(59, 130, 246, 0.3);
}

.success-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .section-title {
    font-size: 2rem;
  }
  
  .form-card {
    padding: 24px;
  }
  
  .room-info {
    grid-template-columns: 1fr;
  }
  
  .invite-methods {
    grid-template-columns: 1fr;
  }
  
  .success-actions {
    flex-direction: column;
  }
}
</style>