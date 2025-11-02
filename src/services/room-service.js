import { getSupabase } from './supabase-client'

// 生成6位数字ID
function generateShortId() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 检查short_id是否已存在
async function isShortIdExists(shortId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('rooms')
    .select('id')
    .eq('short_id', shortId)
    .maybeSingle()
  return !error && !!data
}

// 生成唯一的short_id
async function generateUniqueShortId() {
  let shortId
  let attempts = 0
  do {
    shortId = generateShortId()
    attempts++
    if (attempts > 10) {
      throw new Error('无法生成唯一的房间ID，请重试')
    }
  } while (await isShortIdExists(shortId))
  return shortId
}

class RoomService {
  async createRoom(ownerId, { name, maxPlayers = 6, description } = {}) {
    const supabase = getSupabase()
    const shortId = await generateUniqueShortId()
    const { data, error } = await supabase
      .from('rooms')
      .insert({ 
        owner_id: ownerId, 
        status: 'waiting', 
        name, 
        max_players: maxPlayers, 
        description,
        short_id: shortId
      })
      .select()
      .single()
    if (error) throw error
    // add owner to room_players
    await supabase.from('room_players').insert({ room_id: data.id, user_id: ownerId, role: 'owner', energy: 50, is_ready: false, seat_index: 0 })
    return data
  }

  async joinRoom(roomId, userId) {
    const supabase = getSupabase()
    console.log('[room-service] joinRoom begin', { roomId, userId })
    
    // 检查用户是否已经在其他房间中
    const { data: existingRooms, error: checkError } = await supabase
      .from('room_players')
      .select('room_id, rooms!inner(id, status)')
      .eq('user_id', userId)
    
    if (checkError) throw checkError
    
    // 如果用户已经在其他房间中，先退出
    if (existingRooms && existingRooms.length > 0) {
      for (const existingRoom of existingRooms) {
        if (existingRoom.rooms.status === 'waiting') {
          await this.leaveRoom(existingRoom.room_id, userId)
        }
      }
    }
    
    // 支持通过UUID或short_id查找房间
    let room
    if (roomId.length === 6 && /^\d{6}$/.test(roomId)) {
      // 6位数字ID
      const { data, error } = await supabase.from('rooms').select().eq('short_id', roomId).single()
      if (error) throw error
      room = data
    } else {
      // UUID
      const { data, error } = await supabase.from('rooms').select().eq('id', roomId).single()
      if (error) throw error
      room = data
    }
    
    // 检查房间状态：允许加入等待中的房间；若房间为 ended，则重置为 waiting 以支持重新加入
    if (room.status === 'playing') {
      throw new Error('房间已开始游戏，无法加入')
    }
    if (room.status === 'ended') {
      const { error: resetErr } = await supabase.from('rooms').update({ status: 'waiting' }).eq('id', room.id)
      if (resetErr) throw resetErr
      room.status = 'waiting'
    }
    
    // 检查房间是否已满
    const { data: currentPlayers } = await supabase.from('room_players').select('id').eq('room_id', room.id)
    if (currentPlayers && currentPlayers.length >= (room.max_players || 6)) {
      throw new Error('房间已满，无法加入')
    }
    
    // avoid duplicate join under race conditions: upsert on (room_id, user_id)
    const { data: players } = await supabase.from('room_players').select('seat_index').eq('room_id', room.id)
    const taken = new Set((players || []).filter(p => typeof p.seat_index === 'number').map(p => p.seat_index))
    let seatIndex = null
    for (let i = 0; i < (room.max_players || 6); i++) { if (!taken.has(i)) { seatIndex = i; break } }
    const { error: upsertErr } = await supabase
      .from('room_players')
      .upsert(
        { room_id: room.id, user_id: userId, role: 'player', energy: 50, is_ready: false, seat_index: seatIndex },
        { onConflict: 'room_id,user_id', ignoreDuplicates: true }
      )
    if (upsertErr && upsertErr.code !== '23505') throw upsertErr
    console.log('[room-service] joinRoom success', { roomId: room.id, userId })
    return room
  }

  async getRoom(roomId) {
    const supabase = getSupabase()
    let query = supabase
      .from('rooms')
      .select('id, short_id, name, status, owner_id, max_players, invite_code, room_players(id, user_id, role, energy, is_ready, seat_index)')
    
    // 支持通过UUID或short_id查找房间
    if (roomId.length === 6 && /^\d{6}$/.test(roomId)) {
      query = query.eq('short_id', roomId)
    } else {
      query = query.eq('id', roomId)
    }
    
    const { data, error } = await query.single()
    if (error) throw error
    return data
  }

  async listRooms() {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        id, 
        short_id, 
        name, 
        status, 
        created_at, 
        max_players, 
        invite_code,
        room_players(count)
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    
    // 处理数据，添加当前玩家数量
    const rooms = (data || []).map(room => ({
      ...room,
      current_players: room.room_players ? room.room_players.length : 0
    }))
    
    return rooms
  }

  async quickJoinRandomRoom(userId) {
    const rooms = await this.listRooms()
    const waiting = rooms.filter(r => r.status === 'waiting')
    
    // 如果有等待中的房间，随机选择一个加入
    if (waiting.length > 0) {
      const pick = waiting[Math.floor(Math.random() * waiting.length)]
      await this.joinRoom(pick.id, userId)
      // 返回包含完整玩家信息的房间对象
      return await this.getRoom(pick.id)
    } else {
      // 如果没有等待中的房间，自动创建一个新房间
      console.log('[room-service] 没有可加入的房间，自动创建新房间')
      const newRoom = await this.createRoom(userId, { 
        name: `未命名房间`,
        maxPlayers: 6,
        description: ''
      })
      // 返回包含完整玩家信息的房间对象
      return await this.getRoom(newRoom.id)
    }
  }

  async setReady(roomId, userId, isReady) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('room_players')
      .update({ is_ready: !!isReady })
      .eq('room_id', roomId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async setSeat(roomId, userId, seatIndex) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('room_players')
      .update({ seat_index: seatIndex })
      .eq('room_id', roomId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async startGame(roomId, ownerId) {
    const supabase = getSupabase()
    // check owner
    const { data: room, error: rerr } = await supabase.from('rooms').select().eq('id', roomId).single()
    if (rerr) throw rerr
    if (room.owner_id !== ownerId) throw new Error('只有房主可以开始游戏')
    // check all ready
    const { data: players, error: perr } = await supabase.from('room_players').select('*').eq('room_id', roomId)
    if (perr) throw perr
    const allReady = players.length > 0 && players.every(p => !!p.is_ready)
    if (!allReady) throw new Error('还有玩家未准备')
    // set room status
    const { error: uerr } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
    if (uerr) throw uerr

    // 重置本局玩家资产：
    // 1) 将房间内所有玩家能量重置为50
    const { error: perr2 } = await supabase
      .from('room_players')
      .update({ energy: 50 })
      .eq('room_id', roomId)
    if (perr2) throw perr2

    // 2) 清空本房间已持有的奇物（确保每局从空手开始）
    const { error: aerr } = await supabase
      .from('room_artifacts')
      .delete()
      .eq('room_id', roomId)
    if (aerr) throw aerr

    return { success: true }
  }

  // 玩家退出房间
  async leaveRoom(roomId, userId) {
    const supabase = getSupabase()
    
    // 获取房间信息
    const { data: room, error: roomErr } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomErr) throw roomErr
    
    // 获取房间内所有玩家
    const { data: players, error: playersErr } = await supabase.from('room_players').select('*').eq('room_id', roomId)
    if (playersErr) throw playersErr
    
    // 删除该玩家
    const { error: deleteErr } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)
    if (deleteErr) throw deleteErr
    
    // 获取剩余玩家数量
    const { data: remainingPlayers } = await supabase.from('room_players').select('id, user_id').eq('room_id', roomId)
    const remainingCount = Array.isArray(remainingPlayers) ? remainingPlayers.length : 0
    
    // 如果游戏正在进行且剩余玩家少于2人，不再自动结束游戏（允许单人继续）
    
    // 如果房间为空，重置为 waiting，允许后续加入；并尝试删除空房（如果权限允许）
    if (remainingCount === 0) {
      // 房间为空：将状态重置为 waiting，并清理该房间的活动拍卖，防止跨房间倒计时干扰
      await supabase.from('rooms').update({ status: 'waiting', owner_id: null }).eq('id', roomId)
      // 结束该房间的所有进行中的拍卖（数据库层）
      try {
        const { data: activeAuctions } = await supabase
          .from('auctions')
          .select('id')
          .eq('room_id', roomId)
          .eq('status', 'active')
        for (const a of (activeAuctions || [])) {
          await supabase.from('auctions').update({ status: 'ended', time_remaining: 0 }).eq('id', a.id)
        }
      } catch (_) {}
      await this.deleteEmptyRoom(roomId, userId).catch(() => {})
      return
    }
    
    // 如果退出的是房主，需要移交房主权限
    if (room.owner_id === userId) {
      // 将房主权限移交给第一个玩家
      const newOwner = remainingPlayers[0]
      await supabase
        .from('rooms')
        .update({ owner_id: newOwner.user_id })
        .eq('id', roomId)
      
      // 更新新房主的角色
      await supabase
        .from('room_players')
        .update({ role: 'owner' })
        .eq('room_id', roomId)
        .eq('user_id', newOwner.user_id)
    }
    
    return { success: true }
  }

  // 删除空房间
  async deleteEmptyRoom(roomId, actingUserId) {
    const supabase = getSupabase()
    
    // 检查房间是否真的为空
    const { data: players } = await supabase.from('room_players').select('id').eq('room_id', roomId)
    if (players && players.length > 0) {
      return // 房间不为空，不删除
    }
    
    // 只有房主可以删除房间，避免触发RLS错误
    const { data: room } = await supabase.from('rooms').select('owner_id').eq('id', roomId).single()
    if (!room || room.owner_id !== actingUserId) {
      return
    }
    // 删除房间（由于外键约束，相关的room_players和room_artifacts会自动删除）
    const { error } = await supabase.from('rooms').delete().eq('id', roomId)
    if (error) {
      console.error('删除空房间失败:', error)
    }
  }

  // 定期清理空房间（可以设置定时任务调用）
  async cleanupEmptyRooms() {
    const supabase = getSupabase()
    
    // 查找所有房间（waiting/ended）
    const { data: rooms, error: roomsErr } = await supabase
      .from('rooms')
      .select('id, status')
      .in('status', ['waiting', 'ended'])
    if (roomsErr) throw roomsErr
    
    // 检查每个房间是否有玩家
    for (const room of rooms) {
      const { data: players } = await supabase.from('room_players').select('id').eq('room_id', room.id)
      if (!players || players.length === 0) {
        await this.deleteEmptyRoom(room.id).catch(() => {})
      }
    }
  }
}

export default new RoomService()
