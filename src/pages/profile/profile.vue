<template>
  <div class="profile-container">
    <div class="profile-card">
      <h2 class="title">个人中心</h2>
      
      <div class="user-info" v-if="user">
        <div class="avatar-section">
          <div class="avatar-container">
            <div class="avatar-wrapper" @click="changeAvatar">
              <img 
                class="avatar" 
                :src="userProfile.avatar || defaultAvatar" 
                alt="用户头像"
                @error="handleAvatarError"
              />
              <div v-if="isUploading" class="upload-overlay">
                <div class="upload-spinner"></div>
                <span>上传中...</span>
              </div>
            </div>
            <button class="avatar-edit-btn" @click="changeAvatar" :disabled="isUploading">
              {{ isUploading ? '上传中...' : '更换头像' }}
            </button>
          </div>
        </div>
        
        <div class="info-section">
          <div class="form-field">
            <label>用户名</label>
            <input 
              v-model="userProfile.username" 
              type="text" 
              placeholder="请输入用户名"
              :disabled="!isEditing"
            />
          </div>
          
          <div class="form-field">
            <label>邮箱</label>
            <input 
              v-model="user.email" 
              type="email" 
              disabled
              class="disabled-input"
            />
          </div>
          
          <div class="form-field">
            <label>注册时间</label>
            <input 
              :value="formatDate(user.created_at)" 
              type="text" 
              disabled
              class="disabled-input"
            />
          </div>
        </div>
        
        <div class="actions">
          <button 
            class="btn" 
            @click="toggleEdit"
            v-if="!isEditing"
          >
            编辑资料
          </button>
          <template v-else>
            <button class="btn primary" @click="saveProfile">保存</button>
            <button class="btn" @click="cancelEdit">取消</button>
          </template>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- 游戏统计 -->
      <div class="stats-section">
        <h3>游戏统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ gameStats.totalGames || 0 }}</div>
            <div class="stat-label">总游戏数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ gameStats.wins || 0 }}</div>
            <div class="stat-label">胜利次数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ gameStats.totalArtifacts || 0 }}</div>
            <div class="stat-label">获得奇物</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ gameStats.totalEnergy || 0 }}</div>
            <div class="stat-label">总能量</div>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <!-- 操作按钮 -->
      <div class="profile-actions">
        <button class="btn" @click="$router.push('/menu')">返回菜单</button>
        <button class="btn danger" @click="logout">退出登录</button>
      </div>
      
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
    </div>
  </div>
</template>

<script>
import authService from '../../services/auth-service'
import { getSupabase } from '../../services/supabase-client'

export default {
  name: 'ProfilePage',
  data() {
    return {
      user: null,
      userProfile: {
        username: '',
        avatar: ''
      },
      gameStats: {
        totalGames: 0,
        wins: 0,
        totalArtifacts: 0,
        totalEnergy: 0
      },
      isEditing: false,
      isUploading: false,
      originalProfile: {},
      errorMessage: '',
      successMessage: ''
    }
  },
  computed: {
    defaultAvatar() {
      if (!this.user) return ''
      const code = (this.user.id || 'U').slice(0, 2).toUpperCase()
      const bg = '334155'
      const fg = 'e2e8f0'
      const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='100%' height='100%' fill='#${bg}'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='#${fg}' font-family='Arial, sans-serif'>${code}</text></svg>`)
      return `data:image/svg+xml;charset=utf-8,${svg}`
    }
  },
  async mounted() {
    await this.loadUserData()
    await this.loadUserProfile()
    await this.loadGameStats()
  },
  methods: {
    async loadUserData() {
      const user = await authService.getUser()
      if (user) {
        this.user = user
        this.$store.commit('SET_USER', user)
      } else {
        this.$router.push('/login')
      }
    },
    
    async loadUserProfile() {
      if (!this.user) return
      
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', this.user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          throw error
        }
        
        if (data) {
          this.userProfile = {
            username: data.username || '',
            avatar: data.avatar || ''
          }
        }
      } catch (error) {
        console.error('加载用户资料失败:', error)
        this.errorMessage = '加载用户资料失败'
      }
    },
    
    async loadGameStats() {
      if (!this.user) return
      
      try {
        const supabase = getSupabase()
        
        // 获取游戏统计（这里需要根据实际的游戏数据表结构来查询）
        // 暂时使用模拟数据
        this.gameStats = {
          totalGames: 0,
          wins: 0,
          totalArtifacts: 0,
          totalEnergy: 0
        }
      } catch (error) {
        console.error('加载游戏统计失败:', error)
      }
    },
    
    toggleEdit() {
      this.isEditing = true
      this.originalProfile = { ...this.userProfile }
    },
    
    cancelEdit() {
      this.isEditing = false
      this.userProfile = { ...this.originalProfile }
      this.errorMessage = ''
      this.successMessage = ''
    },
    
    async saveProfile() {
      if (!this.user) return
      
      try {
        const supabase = getSupabase()
        
        // 构建更新数据，只包含有值的字段
        const updateData = {
          id: this.user.id,
          username: this.userProfile.username || null
        }
        
        // 只有当avatar不为空时才包含avatar字段
        if (this.userProfile.avatar) {
          updateData.avatar = this.userProfile.avatar
        }
        
        // 更新或插入用户资料
        const { error } = await supabase
          .from('profiles')
          .upsert(updateData)
        
        if (error) throw error
        
        // 同步更新到全局store，确保菜单/房间界面立即显示最新用户名与头像
        const newUser = {
          ...this.$store.state.user,
          username: this.userProfile.username || (this.$store.state.user && this.$store.state.user.username),
          avatar: this.userProfile.avatar || (this.$store.state.user && this.$store.state.user.avatar)
        }
        this.$store.commit('SET_USER', newUser)
        
        this.isEditing = false
        this.successMessage = '资料保存成功'
        setTimeout(() => {
          this.successMessage = ''
        }, 3000)
        
      } catch (error) {
        console.error('保存用户资料失败:', error)
        this.errorMessage = '保存用户资料失败: ' + (error.message || '未知错误')
      }
    },
    
    changeAvatar() {
      // 创建文件输入元素
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.style.display = 'none'
      
      input.onchange = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        
        // 检查文件大小（限制为2MB）
        if (file.size > 2 * 1024 * 1024) {
          this.errorMessage = '图片大小不能超过2MB'
          return
        }
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          this.errorMessage = '请选择图片文件'
          return
        }
        
        try {
          await this.uploadAvatar(file)
        } catch (error) {
          console.error('头像上传失败:', error)
          this.errorMessage = '头像上传失败'
        }
      }
      
      // 触发文件选择
      document.body.appendChild(input)
      input.click()
      document.body.removeChild(input)
    },
    
    async uploadAvatar(file) {
      this.isUploading = true
      this.errorMessage = ''
      
      try {
        const supabase = getSupabase()
        
        // 生成唯一的文件名
        const fileExt = file.name.split('.').pop()
        const fileName = `${this.user.id}_${Date.now()}.${fileExt}`
        const filePath = `${this.user.id}/${fileName}`
        
        // 上传文件到Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) throw uploadError
        
        // 获取公开URL
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        
        // 更新用户资料中的头像URL
        this.userProfile.avatar = data.publicUrl
        
        // 自动保存
        await this.saveProfile()
        
        this.successMessage = '头像上传成功'
        setTimeout(() => {
          this.successMessage = ''
        }, 3000)
        
      } catch (error) {
        console.error('头像上传失败:', error)
        this.errorMessage = '头像上传失败: ' + (error.message || '未知错误')
      } finally {
        this.isUploading = false
      }
    },
    
    handleAvatarError(event) {
      // 头像加载失败时使用默认头像
      event.target.src = this.defaultAvatar
    },
    
    formatDate(dateString) {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    async logout() {
      try {
        await authService.signOut()
        this.$store.commit('SET_USER', null)
        this.$store.commit('SET_ROOM_ID', null)
        this.$router.push('/login')
      } catch (error) {
        console.error('退出登录失败:', error)
        this.errorMessage = '退出登录失败'
      }
    }
  }
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(1400px circle at 15% 0%, #0b1220, #0f172a),
    radial-gradient(900px circle at 85% 25%, rgba(99,102,241,0.12), rgba(99,102,241,0));
}

.profile-card {
  width: 720px;
  background: #0f172a;
  border: 1px solid #1f2937;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(2,6,23,0.5);
  padding: 24px;
  color: #e2e8f0;
}

.title {
  margin: 0 0 20px;
  font-size: 24px;
  font-weight: 600;
}

.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.avatar-container {
  text-align: center;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid #1f2937;
  transition: border-color 0.3s ease;
  object-fit: cover;
}

.avatar:hover {
  border-color: #3b82f6;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.upload-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 4px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.avatar-edit-btn {
  display: block;
  margin: 8px auto 0;
  padding: 6px 12px;
  background: #1f2937;
  color: #e2e8f0;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.avatar-edit-btn:hover {
  background: #374151;
}

.info-section {
  margin-bottom: 24px;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.form-field input {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: #0b1220;
  color: #e2e8f0;
  border: 1px solid #1f2937;
  outline: none;
  font-size: 14px;
}

.form-field input:focus {
  box-shadow: 0 0 0 2px rgba(59,130,246,0.35);
  border-color: #3b82f6;
}

.form-field input.disabled-input {
  background: #1f2937;
  color: #94a3b8;
  cursor: not-allowed;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 20px;
  border-radius: 8px;
  background: #1f2937;
  color: #e2e8f0;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn:hover {
  background: #374151;
  transform: translateY(-1px);
}

.btn.primary {
  background: #3b82f6;
  color: #fff;
}

.btn.primary:hover {
  background: #2563eb;
}

.btn.danger {
  background: #ef4444;
  color: #fff;
}

.btn.danger:hover {
  background: #dc2626;
}

.divider {
  height: 1px;
  background: #1f2937;
  margin: 24px 0;
}

.stats-section h3 {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #0b1220;
  border: 1px solid #1f2937;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
}

.profile-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error {
  color: #ef4444;
  margin-top: 12px;
  text-align: center;
}

.success {
  color: #10b981;
  margin-top: 12px;
  text-align: center;
}

@media (max-width: 768px) {
  .profile-card {
    width: 100%;
    margin: 0 16px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
