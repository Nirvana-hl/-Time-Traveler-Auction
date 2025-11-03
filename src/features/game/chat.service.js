// 聊天服务：负责房间内消息广播

/**
 * 发送聊天消息到房间
 * @param {Object} deps
 * @param {any} deps.supabase
 * @param {string} deps.roomId
 * @param {Object} deps.message
 */
export async function sendChatMessage({ supabase, roomId, message }) {
  if (!roomId) return
  await supabase.channel(`room_cast_${roomId}`).send({
    type: 'broadcast',
    event: 'chat_message',
    payload: message
  })
}


