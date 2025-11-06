// 封装房间的实时订阅与广播事件处理

/**
 * 订阅房间实时事件
 * @param {Object} deps
 * @param {string} deps.roomId
 * @param {any} deps.supabase
 * @param {()=>Promise<void>} deps.onLoadRoomState - 数据库变化或需要刷新时调用
 * @param {Object} handlers - 自定义事件处理器集合
 * @param {(payload:any)=>void} [handlers.onGameStarted]
 * @param {(duration:number)=>void} [handlers.onAuctionStarted]
 * @param {(data:{auctionId:string, highestBid:number, highestBidder:string})=>void} [handlers.onBidUpdate]
 * @param {(data:{round:number,total:number})=>void} [handlers.onRoundUpdated]
 * @param {()=>void} [handlers.onGameEnded]
 * @param {()=>void} [handlers.onAuctionEnded]
 * @param {(message:any)=>void} [handlers.onChatMessage]
 * @param {()=>void} [ensurePolling] - 当订阅失败时启用兜底轮询
 * @returns {{roomChannel:any, broadcastChannel:any}}
 */
export function subscribeRoomRealtime({ roomId, supabase, onLoadRoomState }, handlers = {}, ensurePolling) {
  if (!roomId) return { roomChannel: null, broadcastChannel: null }

  const roomChannel = supabase
    .channel(`room_db_${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, async () => { await onLoadRoomState() })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_artifacts', filter: `room_id=eq.${roomId}` }, async () => { await onLoadRoomState() })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `room_id=eq.${roomId}` }, async () => { await onLoadRoomState() })
    .on('postgres_changes', { event: 'update', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, async () => { await onLoadRoomState() })
    .subscribe()

  const broadcastChannel = supabase
    .channel(`room_cast_${roomId}`)
    .on('broadcast', { event: 'seat_change' }, async () => { await onLoadRoomState() })
    .on('broadcast', { event: 'ready_change' }, async () => { await onLoadRoomState() })
    .on('broadcast', { event: 'game_started' }, async (payload) => { handlers.onGameStarted && handlers.onGameStarted(payload) })
    .on('broadcast', { event: 'auction_started' }, async (payload) => {
      const duration = Number(payload && payload.payload && payload.payload.duration) || 30
      const roundData = payload && payload.payload ? {
        roundCurrent: payload.payload.roundCurrent,
        roundTotal: payload.payload.roundTotal
      } : null
      handlers.onAuctionStarted && handlers.onAuctionStarted(duration, roundData)
    })
    .on('broadcast', { event: 'auction_bid_update' }, async (payload) => {
      const data = (payload && payload.payload) || {}
      handlers.onBidUpdate && handlers.onBidUpdate(data)
    })
    .on('broadcast', { event: 'round_updated' }, async (payload) => {
      const data = (payload && payload.payload) || {}
      handlers.onRoundUpdated && handlers.onRoundUpdated(data)
    })
    .on('broadcast', { event: 'game_ended' }, async () => { handlers.onGameEnded && handlers.onGameEnded() })
    .on('broadcast', { event: 'auction_ended' }, async () => { handlers.onAuctionEnded && handlers.onAuctionEnded() })
    .on('broadcast', { event: 'chat_message' }, async (payload) => { handlers.onChatMessage && handlers.onChatMessage(payload && payload.payload) })
    .subscribe()

  try {
    // noop
  } catch (e) {
    console.warn('[realtime] subscribe failed', e)
    if (ensurePolling) ensurePolling()
  }

  return { roomChannel, broadcastChannel }
}

export function unsubscribeRoomRealtime(roomChannel, broadcastChannel) {
  if (roomChannel) { try { roomChannel.unsubscribe() } catch (e) {} }
  if (broadcastChannel) { try { broadcastChannel.unsubscribe() } catch (e) {} }
}


