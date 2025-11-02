/**
 * 存储工具函数
 */

/**
 * 保存游戏状态到本地存储
 * @param {Object} gameState - 游戏状态
 */
export function saveGameState(gameState) {
  try {
    uni.setStorageSync('peace_sale_game_state', JSON.stringify(gameState))
  } catch (error) {
    console.error('保存游戏状态失败:', error)
  }
}

/**
 * 从本地存储加载游戏状态
 * @returns {Object|null} 游戏状态对象
 */
export function loadGameState() {
  try {
    const gameStateStr = uni.getStorageSync('peace_sale_game_state')
    if (gameStateStr) {
      return JSON.parse(gameStateStr)
    }
  } catch (error) {
    console.error('加载游戏状态失败:', error)
  }
  return null
}

/**
 * 清除游戏状态
 */
export function clearGameState() {
  try {
    uni.removeStorageSync('peace_sale_game_state')
  } catch (error) {
    console.error('清除游戏状态失败:', error)
  }
}

/**
 * 保存玩家设置
 * @param {Object} settings - 玩家设置
 */
export function savePlayerSettings(settings) {
  try {
    uni.setStorageSync('peace_sale_settings', JSON.stringify(settings))
  } catch (error) {
    console.error('保存玩家设置失败:', error)
  }
}

/**
 * 加载玩家设置
 * @returns {Object} 玩家设置对象
 */
export function loadPlayerSettings() {
  try {
    const settingsStr = uni.getStorageSync('peace_sale_settings')
    if (settingsStr) {
      return JSON.parse(settingsStr)
    }
  } catch (error) {
    console.error('加载玩家设置失败:', error)
  }
  
  // 返回默认设置
  return {
    soundEnabled: true,
    vibrationEnabled: true,
    autoSave: true,
    language: 'zh-CN'
  }
}

/**
 * 保存游戏历史
 * @param {Object} gameHistory - 游戏历史记录
 */
export function saveGameHistory(gameHistory) {
  try {
    const historyList = loadGameHistory()
    historyList.unshift(gameHistory)
    
    // 只保留最近50条记录
    if (historyList.length > 50) {
      historyList.splice(50)
    }
    
    uni.setStorageSync('peace_sale_history', JSON.stringify(historyList))
  } catch (error) {
    console.error('保存游戏历史失败:', error)
  }
}

/**
 * 加载游戏历史
 * @returns {Array} 游戏历史列表
 */
export function loadGameHistory() {
  try {
    const historyStr = uni.getStorageSync('peace_sale_history')
    if (historyStr) {
      return JSON.parse(historyStr)
    }
  } catch (error) {
    console.error('加载游戏历史失败:', error)
  }
  return []
}

/**
 * 清除游戏历史
 */
export function clearGameHistory() {
  try {
    uni.removeStorageSync('peace_sale_history')
  } catch (error) {
    console.error('清除游戏历史失败:', error)
  }
}

/**
 * 保存统计数据
 * @param {Object} stats - 统计数据
 */
export function saveGameStats(stats) {
  try {
    uni.setStorageSync('peace_sale_stats', JSON.stringify(stats))
  } catch (error) {
    console.error('保存统计数据失败:', error)
  }
}

/**
 * 加载统计数据
 * @returns {Object} 统计数据对象
 */
export function loadGameStats() {
  try {
    const statsStr = uni.getStorageSync('peace_sale_stats')
    if (statsStr) {
      return JSON.parse(statsStr)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
  
  // 返回默认统计数据
  return {
    totalGames: 0,
    totalWins: 0,
    totalScore: 0,
    favoriteCollection: '',
    lastPlayTime: null
  }
}

/**
 * 更新统计数据
 * @param {Object} gameResult - 游戏结果
 */
export function updateGameStats(gameResult) {
  const stats = loadGameStats()
  
  stats.totalGames++
  if (gameResult.isWin) {
    stats.totalWins++
  }
  stats.totalScore += gameResult.score || 0
  stats.lastPlayTime = Date.now()
  
  if (gameResult.favoriteCollection) {
    stats.favoriteCollection = gameResult.favoriteCollection
  }
  
  saveGameStats(stats)
}

/**
 * 检查存储空间
 * @returns {Promise<Object>} 存储空间信息
 */
export function checkStorageSpace() {
  return new Promise((resolve, reject) => {
    uni.getStorageInfo({
      success: (res) => {
        resolve({
          currentSize: res.currentSize,
          limitSize: res.limitSize,
          usage: Math.round((res.currentSize / res.limitSize) * 100)
        })
      },
      fail: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * 清理过期数据
 * @param {number} maxAge - 最大保存时间（毫秒）
 */
export function cleanupExpiredData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 默认30天
  try {
    const history = loadGameHistory()
    const now = Date.now()
    const validHistory = history.filter(record => {
      return (now - record.timestamp) < maxAge
    })
    
    if (validHistory.length !== history.length) {
      uni.setStorageSync('peace_sale_history', JSON.stringify(validHistory))
      console.log(`清理了 ${history.length - validHistory.length} 条过期记录`)
    }
  } catch (error) {
    console.error('清理过期数据失败:', error)
  }
}
