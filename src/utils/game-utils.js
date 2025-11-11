/**
 * 游戏工具函数
 */

/**
 * 格式化时间
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 打乱数组
 * @param {Array} array - 要打乱的数组
 * @returns {Array} 打乱后的新数组
 */
export function shuffleArray(array) {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

/**
 * 计算收藏集完成度
 * @param {Object} player - 玩家对象
 * @param {Object} collections - 收藏集配置
 * @returns {number} 完成度百分比
 */
export function calculateCollectionProgress(player, collections) {
  if (!player.collections || !collections) return 0
  
  let completedCount = 0
  let totalCount = 0
  
  Object.keys(collections).forEach(collectionName => {
    const collection = collections[collectionName]
    const currentCount = player.collections[collectionName] || 0
    const requiredCount = collection.requiredCount
    
    totalCount++
    if (currentCount >= requiredCount) {
      completedCount++
    }
  })
  
  return totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
}

/**
 * 计算玩家总分
 * @param {Object} player - 玩家对象
 * @param {Object} collections - 收藏集配置
 * @param {Array} artifacts - 奇物数据
 * @returns {number} 总分
 */
export function calculatePlayerScore(player, collections, artifacts) {
  let totalScore = 0
  
  // 收藏集奖励分数
  if (player.collections) {
    Object.keys(player.collections).forEach(collectionName => {
      const collection = collections[collectionName]
      if (collection && player.collections[collectionName] >= collection.requiredCount) {
        totalScore += collection.rewardPoints
      }
    })
  }
  
  // 零散奇物分数（一半价值）
  if (player.artifacts && artifacts) {
    player.artifacts.forEach(artifactId => {
      const artifact = artifacts.find(a => a.id === artifactId)
      if (artifact) {
        totalScore += Math.floor(artifact.baseValue / 2)
      }
    })
  }
  
  return totalScore
}

/**
 * 获取收藏集要求数量
 * @param {string} collectionName - 收藏集名称
 * @param {Array} collections - 收藏集列表（从 loadCollectionsFromArtifacts 生成）
 * @returns {number} 要求数量
 * @deprecated 建议直接使用 collection.requiredCount，此方法保留以保持向后兼容
 */
export function getCollectionRequirement(collectionName, collections = null) {
  // 如果提供了收藏集列表，优先从列表中查找
  if (collections && Array.isArray(collections)) {
    const collection = collections.find(col => col.name === collectionName)
    if (collection && typeof collection.requiredCount === 'number') {
      return collection.requiredCount
    }
  }
  
  // 回退到硬编码（向后兼容）
  const requirements = {
    '艺术瑰宝': 3,
    '科技奇点': 2,
    '生命奥秘': 3,
    '权力象征': 2
  }
  return requirements[collectionName] || 0
}

/**
 * 检查游戏是否结束
 * @param {Array} deck - 牌堆
 * @param {Array} players - 玩家列表
 * @returns {boolean} 是否结束
 */
export function isGameEnd(deck, players) {
  // 牌堆为空时游戏结束
  if (deck.length === 0) return true
  
  // 所有玩家能量为0时游戏结束
  const allPlayersOutOfEnergy = players.every(player => player.energy <= 0)
  if (allPlayersOutOfEnergy) return true
  
  return false
}

/**
 * 获取游戏阶段文本
 * @param {string} phase - 游戏阶段
 * @returns {string} 阶段文本
 */
export function getGamePhaseText(phase) {
  const phaseMap = {
    'preparation': '准备阶段',
    'auction': '拍卖阶段',
    'settlement': '结算阶段'
  }
  return phaseMap[phase] || '未知阶段'
}

/**
 * 格式化能量显示
 * @param {number} energy - 能量值
 * @returns {string} 格式化后的能量字符串
 */
export function formatEnergy(energy) {
  return `${energy} 能量`
}

/**
 * 格式化分数显示
 * @param {number} score - 分数
 * @returns {string} 格式化后的分数字符串
 */
export function formatScore(score) {
  return `${score} 分`
}
