// 拍卖流程服务，封装 startGame / autoStartAuction 逻辑

/**
 * 开始游戏（房主）
 */
export async function startGame({
  roomId,
  userId,
  isOwner,
  allReady,
  store,
  supabase,
  setCountdown,
  setCurrentPlayerFromRoom,
}) {
  if (!roomId || !userId || !isOwner || !allReady) return

  // 通知后端开始游戏
  // 这里不直接依赖 roomService.startGame，留给调用方完成
  // 调用方应在调用本函数前已完成 startGame 的后端调用

  // 初始化 UI 状态
  store.commit('SET_GAME_PHASE', 'countdown')
  setCountdown(5)
  // 回合归零并设置总回合数（6）
  try { store.commit('RESET_ROUND'); store.commit('SET_ROUND_TOTAL', 6) } catch (_) {}
  store.commit('ADD_GAME_LOG', { timestamp: Date.now(), message: '游戏开始！所有玩家获得50点初始能量（5s后开始拍卖）' })

  // 设置当前玩家（从 room 中解析）
  if (setCurrentPlayerFromRoom) setCurrentPlayerFromRoom()

  // 广播 game_started
  try {
    await supabase.channel(`room_cast_${roomId}`).send({ type: 'broadcast', event: 'game_started', payload: { gamePhase: 'countdown' } })
  } catch (e) { console.warn('[auction-flow] broadcast game_started failed', e) }

  // 预倒计时结束由各客户端在接收到 game_started 后的本地计时器触发；此处不直接调用 onCountdownDone。
}

/**
 * 自动开始一轮拍卖（房主）
 */
export async function autoStartAuction({
  roomId,
  store,
  supabase,
  loadArtifacts,
  dispatchStartAuction,
  startAuctionTimer,
}) {
  store.commit('SET_GAME_PHASE', 'auction')

  const artifacts = await loadArtifacts()
  if (!(artifacts && artifacts.length)) return

  const picks = []
  while (picks.length < Math.min(2, artifacts.length)) {
    const candidate = artifacts[Math.floor(Math.random() * artifacts.length)]
    if (!picks.find(p => p.id === candidate.id)) picks.push(candidate)
  }

  // 去重：避免当前活动拍卖重复
  const existingArtifactIds = new Set((store.state.currentAuctions || []).map(a => a.artifact && a.artifact.id))
  const uniquePicks = picks.filter(a => !existingArtifactIds.has(a.id))
  for (const art of uniquePicks) {
    await dispatchStartAuction(art)
  }

  // 启动统一倒计时
  startAuctionTimer(30)

  try {
    // 日志：本轮拍卖上架的商品
    const names = uniquePicks.map(a => a && a.name).filter(Boolean)
    if (names.length) {
      store.commit('ADD_GAME_LOG', { timestamp: Date.now(), message: `新一轮拍卖开始：${names.join('、')}` })
    }
  } catch (_) {}

  // 推进回合并在第6回合后结束游戏（房主触发）
  try {
    const current = Number(store.state.roundCurrent || 0) + 1
    const total = Number(store.state.roundTotal || 6)
    store.commit('SET_ROUND_CURRENT', Math.min(current, total))
  } catch (_) {}

  if (roomId) {
    await supabase.channel(`room_cast_${roomId}`).send({ type: 'broadcast', event: 'auction_started', payload: { artifacts: picks, duration: 30 } })
    const current = Number(store.state.roundCurrent || 0)
    const total = Number(store.state.roundTotal || 6)
    // 结束条件：达到总回合数
    if (current >= total) {
      try { await supabase.from('rooms').update({ status: 'ended' }).eq('id', roomId) } catch (_) {}
      await supabase.channel(`room_cast_${roomId}`).send({ type: 'broadcast', event: 'game_ended', payload: { reason: 'round_limit' } })
    }
  }
}


