// 封装房间状态同步逻辑，减少页面体积并提升可读性

/**
 * 同步房间状态（副作用式）：
 * - 拉取房间与玩家并按座位排序
 * - 根据房间状态切换阶段与清理倒计时
 * - 在 playing 同步活跃拍卖
 * - 在 ended 进入结算并回退
 * - 拉取 profiles（昵称/头像）
 * - 拉取当前用户手牌并写入 store
 */
export async function loadRoomState({
  roomId,
  roomService,
  supabase,
  artifactMap,
  store,
  setRoom,
  setProfileMap,
  setGamePhase,
  clearAuctionTimer,
  setAuctionCountdown,
  onShowGameEnd,
}) {
  try {
    if (!roomId) { setRoom(null); return }

    // 房间与玩家
    const room = await roomService.getRoom(roomId)
    const players = (room && room.room_players) ? [...room.room_players] : []
    players.sort((a, b) => {
      const ai = (typeof a.seat_index === 'number') ? a.seat_index : 9999
      const bi = (typeof b.seat_index === 'number') ? b.seat_index : 9999
      return ai - bi
    })
    room.room_players = players
    setRoom(room)

    // 等待态 -> 准备阶段并清理倒计时与拍卖
    if (room && room.status === 'waiting') {
      setGamePhase('preparation')
      clearAuctionTimer && clearAuctionTimer()
      setAuctionCountdown && setAuctionCountdown(0)
      store.commit('SET_CURRENT_AUCTIONS', [])
    }

    // playing -> 同步活跃拍卖
    if (room && room.status === 'playing') {
      try {
        const { data: dbAuctions } = await supabase
          .from('auctions')
          .select('*')
          .eq('status', 'active')
          .eq('room_id', roomId)

        const existingIds = new Set((store.state.currentAuctions || []).map(a => a.id))
        for (const row of (dbAuctions || [])) {
          if (existingIds.has(row.id)) continue
          const artifact = row.artifact || artifactMap[row.artifact_id] || { id: row.artifact_id, name: row.artifact_id }
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
          store.commit('ADD_OR_UPDATE_AUCTION', auction)
        }
        if ((dbAuctions || []).length > 0) {
          setGamePhase('auction')
        }
      } catch (e) {
        console.warn('[room-state] sync active auctions failed', e)
      }
    }

    // 结束态 -> 进入结算并触发回退
    if (room && room.status === 'ended') {
      setGamePhase('settlement')
      onShowGameEnd && onShowGameEnd()
    }

    // 加载 profiles
    const ids = Array.from(new Set(players.map(p => p.user_id).filter(Boolean)))
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, avatar')
        .in('id', ids)
      const map = {}
      ;(profs || []).forEach(p => { map[p.id] = { username: p.username, avatar: p.avatar } })
      setProfileMap(map)
    } else {
      setProfileMap({})
    }

    // 同步当前用户手牌
    try {
      const uid = store.state.user && store.state.user.id
      if (roomId && uid) {
        const { data: owned } = await supabase
          .from('room_artifacts')
          .select('artifact_id')
          .eq('room_id', roomId)
          .eq('owner_user_id', uid)
        const aids = (owned || []).map(r => r.artifact_id)
        const me = (room && room.room_players ? room.room_players : []).find(p => p.user_id === uid)
        if (me) {
          const next = {
            id: me.user_id,
            name: (store.state.user && store.state.user.email) || me.user_id,
            energy: 50,
            artifacts: aids,
            items: []
          }
          store.commit('SET_CURRENT_PLAYER', next)
          store.commit('SET_PLAYER_ARTIFACTS', aids)
        }
      }
    } catch (e) {
      console.warn('[room-state] sync player hand failed', e)
    }
  } catch (e) {
    console.warn('[room-state] loadRoomState failed', e)
  }
}


