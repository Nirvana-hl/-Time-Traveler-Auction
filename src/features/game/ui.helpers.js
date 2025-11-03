// UI 辅助：头像、昵称、时间格式化

export function formatMessageTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function getAvatarFor({ profileMap, userId }) {
  const prof = profileMap && profileMap[userId]
  if (prof && prof.avatar) return prof.avatar
  const code = ((prof && prof.username) ? prof.username : (userId || 'U')).toString().slice(0, 2).toUpperCase()
  const bg = '334155'
  const fg = 'e2e8f0'
  const svg = encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='100%' height='100%' fill='#" + bg + "'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='#" + fg + "' font-family='Arial, sans-serif'>" + code + "</text></svg>")
  return 'data:image/svg+xml;charset=utf-8,' + svg
}

export function getNameFor({ profileMap, room, userId }) {
  const prof = profileMap && profileMap[userId]
  if (prof && prof.username) return prof.username
  if (room && room.owner_id === userId) return '房主'
  return (userId || '').slice(0, 6)
}



