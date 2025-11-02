import { getSupabase } from './supabase-client'

class AuthService {
  async signUpAccount(account, password, username) {
    const supabase = getSupabase()
    // 如果 account 是邮箱，直接用；否则生成系统邮箱（满足 Supabase 约束）
    const isEmail = /@/.test(account)
    const email = isEmail ? account : `${account}@local.invalid`
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data && data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, username: username || account, account })
    }
    return data
  }

  async signInAccount(account, password) {
    const supabase = getSupabase()
    let email = account
    if (!/@/.test(account)) {
      const { data: prof } = await supabase.from('profiles').select('id, username, account').eq('username', account).maybeSingle()
      email = (prof && prof.account) ? `${prof.account}@local.invalid` : `${account}@local.invalid`
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async signOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
  }

  async getUser() {
    const supabase = getSupabase()
    const { data } = await supabase.auth.getUser()
    if (!data || !data.user) return null
    
    // 获取用户资料
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar')
        .eq('id', data.user.id)
        .single()
      
      // 将资料信息合并到用户对象中
      return {
        ...data.user,
        username: profile && profile.username,
        avatar: profile && profile.avatar
      }
    } catch (e) {
      console.warn('Failed to load user profile:', e)
      return data.user
    }
  }

  onAuthStateChange(callback) {
    const supabase = getSupabase()
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      const baseUser = (session && session.user) || null
      if (!baseUser) {
        callback(null)
        return
      }
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar')
          .eq('id', baseUser.id)
          .single()
        const merged = {
          ...baseUser,
          username: profile && profile.username,
          avatar: profile && profile.avatar
        }
        callback(merged)
      } catch (_) {
        callback(baseUser)
      }
    })
  }
}

export default new AuthService()
