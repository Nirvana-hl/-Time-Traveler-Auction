<template>
  <div class="auth-container">
    <div class="topbar">
      <button class="btn link" @click.prevent.stop="$router.replace('/menu')">返回菜单</button>
    </div>
    <div class="auth-card">
      <div class="form-field">
        <label>账号（邮箱或用户名）</label>
        <input v-model="account" type="text" placeholder="输入邮箱或用户名" />
      </div>
      <div class="form-field">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="至少6位" />
      </div>
      <div class="form-field" v-if="mode==='register'">
        <label>昵称（注册时可选）</label>
        <input v-model="username" type="text" placeholder="你的昵称" />
      </div>
      <p class="hint">{{ mode==='login' ? '使用账号（邮箱或用户名）登录后进入菜单创建或加入房间' : '仅用账号+密码注册；如使用用户名注册将生成系统邮箱' }}</p>
      <div class="actions">
        <button class="btn primary" :disabled="isSubmitting" v-if="mode==='login'" @click.prevent.stop="handleSignIn">{{ isSubmitting ? '处理中...' : '登录' }}</button>
        <button class="btn primary" :disabled="isSubmitting" v-else @click.prevent.stop="handleSignUp">{{ isSubmitting ? '处理中...' : '注册' }}</button>
        <button class="btn link" :disabled="isSubmitting" @click.prevent.stop="toggleRegister">{{ mode==='login' ? '没有账号？注册' : '已有账号？去登录' }}</button>
      </div>
    </div>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<script>
import authService from '../../services/auth-service'

export default {
  name: 'LoginPage',
  data() {
    return {
      account: '',
      password: '',
      username: '',
      errorMessage: '',
      mode: 'login',
      isSubmitting: false
    }
  },
  methods: {
    async handleSignUp() {
      this.errorMessage = ''
      try {
        const res = await authService.signUpAccount(this.account, this.password, this.username)
        const user = (res && res.user)
        if (user) {
          this.$store.commit('SET_USER', user)
          this.$router.push('/menu')
        }
      } catch (e) {
        this.errorMessage = e.message || '注册失败'
      }
    },
    async handleSignIn() {
      this.errorMessage = ''
      try {
        const res = await authService.signInAccount(this.account, this.password)
        const user = (res && res.user)
        if (user) {
          this.$store.commit('SET_USER', user)
          this.$router.push('/menu')
        }
      } catch (e) {
        this.errorMessage = e.message || '登录失败'
      }
    },
    toggleRegister() {
      this.mode = this.mode === 'login' ? 'register' : 'login'
    }
  }
}
</script>

<style scoped>
.auth-container { min-height: 100vh; display: flex; flex-direction:column; align-items: center; justify-content: flex-start; padding: 24px; background:
  radial-gradient(1400px circle at 15% 0%, #0b1220, #0f172a),
  radial-gradient(900px circle at 85% 25%, rgba(99,102,241,0.12), rgba(99,102,241,0)); }
.topbar { width:100%; display:flex; justify-content:flex-end; align-items:center; margin-bottom: 12px; }
.btn.link { background: transparent; color: #3b82f6; text-decoration: underline; }
.auth-container::before { content:''; position:fixed; inset:0; pointer-events:none; background:
  radial-gradient(600px 300px at 20% 10%, rgba(99,102,241,0.18), rgba(99,102,241,0)),
  radial-gradient(400px 200px at 80% 30%, rgba(16,185,129,0.14), rgba(16,185,129,0)),
  radial-gradient(500px 250px at 50% 80%, rgba(234,179,8,0.10), rgba(234,179,8,0)); filter: blur(20px); z-index: 0; }
.auth-card { width: 420px; background: #0f172a; border: 1px solid #1f2937; border-radius: 16px; box-shadow: 0 20px 40px rgba(2,6,23,0.5); padding: 20px; position: relative; overflow: hidden; z-index: 1; }
.auth-card::after { content:''; position:absolute; inset:-1px; border-radius:16px; padding:1px; background: linear-gradient(90deg, rgba(59,130,246,0.25), rgba(16,185,129,0.25)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.auth-container::after { content:''; position:fixed; inset:0; pointer-events:none; background-image: radial-gradient(2px 2px at 20% 30%, rgba(226,232,240,0.12), transparent), radial-gradient(1.5px 1.5px at 60% 70%, rgba(226,232,240,0.08), transparent); background-repeat: repeat; animation: starfield 20s linear infinite; opacity: .6; }
@keyframes starfield { from { background-position: 0 0, 0 0; } to { background-position: 200px 300px, -200px -300px; }
}
.form-field { margin-bottom: 12px; }
label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
input { width: 100%; padding: 10px 12px; border-radius: 8px; background: #0b1220; color:#e2e8f0; border:1px solid #1f2937; outline:none; }
input:focus { box-shadow: 0 0 0 2px rgba(59,130,246,0.35); border-color:#3b82f6; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.btn { padding: 10px 14px; border-radius: 10px; background: #1f2937; color:#e2e8f0; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
.btn.primary { background: #3b82f6; color: #fff; }
.btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.2); }
.error { color: #ef4444; margin-top: 8px; text-align: center; }
.hint { color: #94a3b8; font-size: 12px; margin-top: 8px; text-align:center; }
</style>
