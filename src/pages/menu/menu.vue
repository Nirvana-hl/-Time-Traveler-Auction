<template>
  <div class="menu-container">
    <!-- 首次登录剧情对话 -->
    <div v-if="showFirstLoginDialogue" class="dialogue-overlay" @click="nextDialogue">
      <div class="dialogue-container" @click.stop>
        <!-- 角色立绘 -->
        <div class="character-portrait" :class="{ 'slide-in-right': currentDialogue.character === '大木博士' || currentDialogue.character === 'Dr. Alina' }">
          <img :src="currentCharacter.image" :alt="currentDialogue.character" class="character-image" />
        </div>
        
        <!-- 对话框 -->
        <div class="dialogue-box" :class="{ 'slide-in-left': currentDialogue.character === '大木博士' || currentDialogue.character === 'Dr. Alina' }">
          <div class="dialogue-header">
            <span class="character-name" :style="{ color: currentCharacter.color }">{{ currentDialogue.character }}</span>
            <div class="dialogue-progress">
              <span class="progress-text">{{ currentDialogueIndex + 1 }}/{{ dialogueConfig.dialogues.length }}</span>
            </div>
          </div>
          <div class="dialogue-content">
            <p class="dialogue-text" ref="dialogueText">{{ displayedText }}</p>
          </div>
          <div class="dialogue-footer">
            <div class="typing-indicator" v-if="isTyping">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
            <div v-else class="footer-content">
              <button class="next-button" @click="nextDialogue">
                {{ isLastDialogue ? dialogueConfig.buttonText : '点击继续' }}
              </button>
              <label class="skip-checkbox" v-if="isLastDialogue">
                <input type="checkbox" v-model="skipDialogue" />
                <span class="checkbox-label">下次不再显示</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-content">
        <div class="brand">
          <div class="brand-icon">⚡</div>
          <span class="brand-text">时空旅人拍卖会</span>
        </div>
        <div class="nav-actions" v-if="$store.state.user">
          <div class="user-info">
            <img class="user-avatar" :src="getUserAvatar()" alt="用户头像" />
            <span class="user-name">{{ getUserName() }}</span>
          </div>
          <button class="nav-btn" @click="$router.push('/profile')">
            <span class="btn-icon">👤</span>
            个人中心
          </button>
          <button class="nav-btn logout" @click="logout">
            <span class="btn-icon">🚪</span>
            登出
          </button>
      </div>
        <div class="nav-actions" v-else>
          <button class="nav-btn primary" @click="$router.push('/login')">
            <span class="btn-icon">🔑</span>
            登录 / 注册
          </button>
      </div>
    </div>
    </nav>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 英雄区域 -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">🎮 创新桌游体验</div>
          <h1 class="hero-title">
            <span class="title-highlight">时空旅人</span>
            <br>拍卖会
          </h1>
          <p class="hero-subtitle">
            结合实体卡牌与数字科技的创新线下桌游<br>
            扮演时空旅人，竞拍奇物，争夺时空影响力
          </p>
          <div class="hero-actions">
            <button class="hero-btn primary" @click="quickStart">
              <span class="btn-icon">⚡</span>
              快速开始
            </button>
            <button class="hero-btn secondary" @click="scrollToGame">
              <span class="btn-icon">🎯</span>
              了解更多
            </button>
      </div>
    </div>
        <div class="hero-visual">
          <div class="floating-card card-1">🏺</div>
          <div class="floating-card card-2">⚔️</div>
          <div class="floating-card card-3">📜</div>
          <div class="floating-card card-4">💎</div>
        </div>
      </section>

      <!-- 游戏操作区域 -->
      <section class="game-section" ref="gameSection">
        <div class="section-header">
      <h2 class="section-title">开始游戏</h2>
          <p class="section-subtitle">选择你的游戏方式</p>
      </div>

        <div class="game-actions">
          <div class="action-card primary">
            <div class="card-icon">🏠</div>
            <h3 class="card-title">创建房间</h3>
            <p class="card-desc">创建专属游戏房间，邀请朋友一起游戏</p>
            <button class="card-btn" @click="createRoom">创建房间</button>
      </div>

          <div class="action-card secondary">
            <div class="card-icon">🔍</div>
            <h3 class="card-title">选择房间</h3>
            <p class="card-desc">浏览房间列表，选择喜欢的房间加入</p>
            <button class="card-btn" @click="goRooms">选择房间</button>
      </div>
          
          
    </div>

        <!-- 加入房间表单 -->
        <div class="join-room-section">
          <div class="form-header">
            <h3 class="form-title">通过房间ID加入</h3>
            <p class="form-subtitle">输入房间ID直接加入指定房间</p>
      </div>
          <div class="form-content">
            <div class="input-group">
              <div class="input-icon">🔢</div>
              <input 
                v-model="roomIdInput" 
                type="text" 
                placeholder="输入房间ID（支持6位数字或完整UUID）"
                class="room-input"
                @keyup.enter="joinRoom"
              />
              <button class="input-btn" @click="joinRoom" :disabled="!roomIdInput">
                加入
              </button>
      </div>
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </div>
    </div>
      </section>

      <!-- 功能特色区域 -->
      <section class="features-section">
        <div class="section-header">
          <h2 class="section-title">游戏特色</h2>
          <p class="section-subtitle">体验独特的时空拍卖玩法</p>
        </div>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🏺</div>
            <h3 class="feature-title">奇物拍卖</h3>
            <p class="feature-desc">竞拍来自不同时空的珍贵奇物，每件都有独特的历史背景和价值</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⚡</div>
            <h3 class="feature-title">道具交互</h3>
            <p class="feature-desc">使用时空乱流、赝品鉴定等道具改变拍卖局势，增加策略深度</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📚</div>
            <h3 class="feature-title">收藏集系统</h3>
            <p class="feature-desc">构建独特的收藏集组合，获得时空影响力，争夺最高荣誉</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import roomService from '../../services/room-service'
import authService from '../../services/auth-service'
import { firstLoginDialogue, getCurrentLanguage, shouldSkipDialogue, setSkipDialogue } from '../../config/dialogue-config'

export default {
  name: 'MenuPage',
  data() {
    return {
      roomIdInput: '',
      errorMessage: '',
      room: null,
      refreshTimer: null,
      
      // 首次登录对话相关状态
      showFirstLoginDialogue: false,
      currentDialogueIndex: 0,
      displayedText: '',
      isTyping: false,
      typingTimer: null,
      currentLanguage: getCurrentLanguage(),
      skipDialogue: false
    }
  },
  computed: {
    hasRoom() { return !!this.room },
    allReady() {
      if (!this.room || !this.room.room_players) return false
      const players = this.room.room_players
      return players.length > 0 && players.every(p => !!p.is_ready)
    },
    isOwner() { return this.room && this.$store.state.user && this.room.owner_id === this.$store.state.user.id },
    canStart() { return this.hasRoom && this.allReady && this.isOwner },
    
    // 对话相关计算属性
    dialogueConfig() {
      return firstLoginDialogue.languages[this.currentLanguage]
    },
    currentDialogue() {
      return this.dialogueConfig.dialogues[this.currentDialogueIndex]
    },
    currentCharacter() {
      return firstLoginDialogue.characters[this.currentDialogue.character]
    },
    isLastDialogue() {
      return this.currentDialogueIndex === this.dialogueConfig.dialogues.length - 1
    }
  },
  async mounted() {
    const user = await authService.getUser()
    if (user) {
      console.log('Loaded user:', user) // 调试信息
      this.$store.commit('SET_USER', user)
      
      // 检查是否需要显示对话（每次登录都显示，除非用户选择跳过）
      if (!shouldSkipDialogue()) {
        // 延迟显示对话，让页面先加载完成
        setTimeout(() => {
          this.showFirstLoginDialogue = true
          this.startDialogue()
        }, 1000)
      }
    }
    this.refreshTimer = setInterval(this.loadRoom, 5000)
    await this.loadRoom()
  },
  beforeDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
  },
  methods: {
    // 对话相关方法
    startDialogue() {
      this.currentDialogueIndex = 0
      this.typeText(this.currentDialogue.text)
    },
    
    typeText(text) {
      this.isTyping = true
      this.displayedText = ''
      let index = 0
      
      if (this.typingTimer) {
        clearInterval(this.typingTimer)
      }
      
      this.typingTimer = setInterval(() => {
        if (index < text.length) {
          this.displayedText += text.charAt(index)
          index++
        } else {
          clearInterval(this.typingTimer)
          this.isTyping = false
        }
      }, firstLoginDialogue.animations.textTypingSpeed)
    },
    
    nextDialogue() {
      if (this.isTyping) {
        // 如果正在打字，直接显示完整文本
        clearInterval(this.typingTimer)
        this.displayedText = this.currentDialogue.text
        this.isTyping = false
        return
      }
      
      if (this.isLastDialogue) {
        // 对话结束
        this.endDialogue()
        return
      }
      
      // 下一句对话
      this.currentDialogueIndex++
      this.typeText(this.currentDialogue.text)
    },
    
    endDialogue() {
      // 保存用户的选择状态
      if (this.skipDialogue) {
        setSkipDialogue(true)
      }
      this.showFirstLoginDialogue = false
      this.currentDialogueIndex = 0
      this.displayedText = ''
      this.skipDialogue = false
    },

    async loadRoom() {
      try {
        const rid = this.$store.state.roomId
        if (!rid) { this.room = null; return }
        this.room = await roomService.getRoom(rid)
      } catch (e) { console.warn('[menu] loadRoom failed', e) }
    },
    goRoom() { this.$router.push('/room') },
    
    goRooms() { this.$router.push('/rooms') },
    async createRoom() {
      const user = this.$store.state.user
      if (!user) return this.$router.push('/login')
      this.$router.push('/create-room')
    },
    async joinRoom() {
      this.errorMessage = ''
      try {
        const user = this.$store.state.user
        console.log('[menu.vue] joinRoom clicked', { input: this.roomIdInput, userId: user && user.id })
        if (!user) return this.$router.push('/login')
        if (!this.roomIdInput) throw new Error('请填写房间ID')
        const room = await roomService.joinRoom(this.roomIdInput, user.id)
        console.log('[menu.vue] joinRoom success', { roomId: room && room.id })
        this.$store.commit('SET_ROOM_ID', room.id)
        await this.loadRoom()
        this.$router.push({ path: '/game', query: { roomId: room.id } })
      } catch (e) {
        this.errorMessage = e.message || '加入房间失败'
      }
    },
    async quickStart() {
      this.errorMessage = ''
      try {
        const user = this.$store.state.user
        if (!user) return this.$router.push('/login')
        const room = await roomService.quickJoinRandomRoom(user.id)
        this.$store.commit('SET_ROOM_ID', room.id)
        await this.$nextTick()
        this.$router.push({ path: '/game', query: { roomId: room.id } })
      } catch (e) {
        this.errorMessage = e.message || '暂时无法快速加入房间'
      }
    },
    async logout() {
      await authService.signOut()
      this.$store.commit('SET_USER', null)
      this.$store.commit('SET_ROOM_ID', null)
      this.$router.push('/menu')
    },
    scrollToGame() {
      this.$refs.gameSection.scrollIntoView({ behavior: 'smooth' })
    },
    getUserAvatar() {
      const user = this.$store.state.user
      if (!user) return 'https://via.placeholder.com/36x36?text=U'
      if (user.avatar) return user.avatar
      const code = (user.username || (user.email ? user.email.split('@')[0] : 'U')).toString().slice(0, 2).toUpperCase()
      const bg = '334155'
      const fg = 'e2e8f0'
      const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36'><rect width='100%' height='100%' fill='#${bg}'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='#${fg}' font-family='Arial, sans-serif'>${code}</text></svg>`)
      return `data:image/svg+xml;charset=utf-8,${svg}`
    },
    getUserName() {
      const user = this.$store.state.user
      if (!user) return '游客'
      if (user.username) return user.username
      return user.email ? user.email.split('@')[0] : '用户'
    }
  }
}
</script>

<style scoped>
.menu-container {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #e2e8f0;
}

/* 固定背景图 */
.menu-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image: url('/images/22DF74E40A62E32AEED2DF9D7F66AFF5.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: -2;
  pointer-events: none;
}

/* 渐变覆盖层 */
.menu-container::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(
    135deg, 
    rgba(15, 23, 42, 0.9) 0%, 
    rgba(30, 41, 59, 0.9) 50%, 
    rgba(51, 65, 85, 0.9) 100%
  );
  z-index: -1;
  pointer-events: none;
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
  animation: pulse 2s infinite;
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

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #3b82f6;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
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

.nav-btn.primary {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
}

.nav-btn.logout {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.nav-btn.logout:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* 主要内容区域 */
.main-content {
  padding-top: 64px;
}

/* 英雄区域 */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.hero-content {
  text-align: center;
  z-index: 2;
  max-width: 800px;
  padding: 0 24px;
}

.hero-badge {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 20px;
  font-size: 14px;
  margin-bottom: 24px;
  animation: fadeInUp 1s ease-out;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  animation: fadeInUp 1s ease-out 0.2s both;
}

.title-highlight {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #94a3b8;
  margin-bottom: 40px;
  animation: fadeInUp 1s ease-out 0.4s both;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  animation: fadeInUp 1s ease-out 0.6s both;
}

.hero-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.hero-btn.primary {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.hero-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
}

.hero-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hero-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* 浮动卡片动画 */
.hero-visual {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.floating-card {
  position: absolute;
  font-size: 3rem;
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;
}

.card-1 {
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.card-2 {
  top: 30%;
  right: 15%;
  animation-delay: 1.5s;
}

.card-3 {
  bottom: 30%;
  left: 20%;
  animation-delay: 3s;
}

.card-4 {
  bottom: 20%;
  right: 10%;
  animation-delay: 4.5s;
}

/* 游戏操作区域 */
.game-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
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

.game-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.action-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.action-card.primary {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border-color: rgba(59, 130, 246, 0.3);
}

.action-card.secondary {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.1));
  border-color: rgba(16, 185, 129, 0.3);
}

.action-card.tertiary {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
  border-color: rgba(139, 92, 246, 0.3);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.card-desc {
  color: #94a3b8;
  margin-bottom: 24px;
  line-height: 1.6;
}

.card-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

/* 加入房间表单 */
.join-room-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
}

.form-header {
  text-align: center;
  margin-bottom: 24px;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-subtitle {
  color: #94a3b8;
}

.form-content {
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

/* 功能特色区域 */
.features-section {
  padding: 80px 24px;
  background: rgba(0, 0, 0, 0.2);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.feature-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.feature-desc {
  color: #94a3b8;
  line-height: 1.6;
}

/* 首次登录对话样式 */
.dialogue-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.5s ease-out;
}

.dialogue-container {
  display: flex;
  align-items: flex-end;
  gap: 32px;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
}

.character-portrait {
  flex-shrink: 0;
  width: 300px;
  height: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transform: translateX(50px);
}

.character-portrait.slide-in-right {
  animation: slideInRight 0.6s ease-out forwards;
}

.character-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dialogue-box {
  flex: 1;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  opacity: 0;
  transform: translateX(-50px);
}

.dialogue-box.slide-in-left {
  animation: slideInLeft 0.6s ease-out forwards;
}

.dialogue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.character-name {
  font-size: 1.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dialogue-progress {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  color: #94a3b8;
}

.dialogue-content {
  margin-bottom: 24px;
  min-height: 120px;
}

.dialogue-text {
  font-size: 1.125rem;
  line-height: 1.6;
  color: #e2e8f0;
  margin: 0;
}

.dialogue-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-height: 40px;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.skip-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #94a3b8;
  transition: color 0.3s ease;
}

.skip-checkbox:hover {
  color: #e2e8f0;
}

.skip-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border: 2px solid #64748b;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skip-checkbox input[type="checkbox"]:checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.checkbox-label {
  user-select: none;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  animation: pulse 1.5s infinite;
}

.typing-indicator span {
  color: #3b82f6;
  font-size: 1.5rem;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

.next-button {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.next-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

/* 对话动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 动画 */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .nav-actions {
    gap: 8px;
  }
  
  .user-name {
    display: none;
  }
  
  .game-actions {
    grid-template-columns: 1fr;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
