// 房间基础操作：准备、换座、离开房间

export async function toggleReady({ roomId, userId, room, roomService, reload }) {
  if (!roomId || !userId) return
  const me = (room && room.room_players ? room.room_players : []).find(p => p.user_id === userId)
  const next = !(me && me.is_ready)
  await roomService.setReady(roomId, userId, next)
  if (reload) await reload()
}

export async function moveToSeat({ roomId, userId, room, seats, roomService, reload }) {
  if (!roomId || !userId) return
  const me = (room && room.room_players ? room.room_players : []).find(p => p.user_id === userId)
  const myOld = (me && typeof me.seat_index === 'number') ? me.seat_index : -1
  const target = seats && seats.player ? seats.player : null
  const idx = seats && typeof seats.index === 'number' ? seats.index : -1
  if (idx < 0) return
  if (target && target.user_id && target.user_id !== userId) {
    await roomService.setSeat(roomId, target.user_id, null)
    await roomService.setSeat(roomId, userId, idx)
    if (myOld >= 0) await roomService.setSeat(roomId, target.user_id, myOld)
  } else {
    await roomService.setSeat(roomId, userId, idx)
  }
  if (reload) await reload()
}

export async function leaveRoom({
  roomId,
  userId,
  clearAuctionTimer,
  setCountdown,
  store,
  auctionService,
  roomService,
  unsubscribe,
  setRoomId,
  setLocalRoom,
  navigateToRooms,
}) {
  if (!roomId || !userId) return
  clearAuctionTimer && clearAuctionTimer()
  setCountdown && setCountdown(0)
  store.commit('SET_GAME_PHASE', 'preparation')
  store.commit('SET_CURRENT_AUCTIONS', [])
  try { auctionService.stopAll() } catch (_) {}
  await roomService.leaveRoom(roomId, userId)
  unsubscribe && unsubscribe()
  setRoomId && setRoomId(null)
  setLocalRoom && setLocalRoom(null)
  navigateToRooms && navigateToRooms()
}


