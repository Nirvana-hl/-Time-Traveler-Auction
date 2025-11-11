/**
 * 游戏状态管理服务
 */
class GameStateService {
  constructor() {
    this.gameState = {
      gameId: null,
      phase: 'preparation', // preparation, auction, settlement
      players: [],
      currentAuction: null,
      deck: [],
      gameLog: []
    }
  }

  /**
   * 初始化游戏
   * @param {Array} playerNames - 玩家名称列表
   */
  initializeGame(playerNames) {
    this.gameState.gameId = this.generateGameId()
    this.gameState.phase = 'preparation'
    this.gameState.players = playerNames.map((name, index) => ({
      id: `player_${index + 1}`,
      name: name,
      energy: 50, // 初始能量
      artifacts: [],
      collections: {
        "艺术瑰宝": 0,
        "科技奇点": 0,
        "生命奥秘": 0,
        "权力象征": 0
      }
    }))
    
    this.gameState.deck = this.initializeDeck()
    this.gameState.gameLog = []
    
    this.addGameLog('游戏开始！所有玩家获得50点初始能量')
    return this.gameState
  }

  /**
   * 生成游戏ID
   */
  generateGameId() {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 初始化牌堆
   */
  async initializeDeck() {
    try {
      const data = require('../../static/data/artifacts.json')
      const artifacts = Array.isArray(data) ? data : (data.default || [])
      return this.shuffleArray([...artifacts])
    } catch (error) {
      console.error('加载卡牌数据失败:', error)
      return []
    }
  }

  /**
   * 打乱数组
   */
  shuffleArray(array) {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  /**
   * 开始拍卖阶段
   */
  startAuctionPhase() {
    this.gameState.phase = 'auction'
    this.addGameLog('拍卖阶段开始！')
    return this.gameState
  }

  /**
   * 结束游戏
   */
  endGame() {
    this.gameState.phase = 'settlement'
    this.calculateFinalScores()
    this.addGameLog('游戏结束！开始结算分数')
    return this.gameState
  }

  /**
   * 计算最终分数
   */
  calculateFinalScores() {
    this.gameState.players.forEach(player => {
      let totalScore = 0
      
      // 收藏集奖励分数
      Object.keys(player.collections).forEach(collectionName => {
        const collection = this.getCollectionByName(collectionName)
        if (collection && player.collections[collectionName] >= collection.requiredCount) {
          totalScore += collection.rewardPoints
        }
      })
      
      // 零散奇物分数（一半价值）
      player.artifacts.forEach(artifactId => {
        const artifact = this.getArtifactById(artifactId)
        if (artifact) {
          totalScore += Math.floor(artifact.baseValue / 2)
        }
      })
      
      player.finalScore = totalScore
    })
    
    // 按分数排序
    this.gameState.players.sort((a, b) => b.finalScore - a.finalScore)
  }

  /**
   * 获取收藏集信息
   * 注意：此方法已废弃，建议使用 loadCollectionsFromArtifacts 动态生成
   * 保留此方法以保持向后兼容
   */
  async getCollectionByName(collectionName) {
    try {
      // 尝试从动态生成的收藏集中查找
      if (this.gameState.deck && this.gameState.deck.length > 0) {
        const { loadCollectionsFromArtifacts } = require('../features/game/collections.utils')
        const artifactMap = {}
        this.gameState.deck.forEach(artifact => {
          if (artifact && artifact.id) {
            artifactMap[artifact.id] = artifact
          }
        })
        const collections = loadCollectionsFromArtifacts(artifactMap)
        const found = collections.find(col => col.name === collectionName)
        if (found) return found
      }
      
      // 回退到 JSON 文件（如果存在）
      try {
        const data = require('../../static/data/collections.json')
        const list = Array.isArray(data) ? data : (data.default || [])
        return list.find(collection => collection.name === collectionName) || null
      } catch (jsonError) {
        return null
      }
    } catch (error) {
      console.error('加载收藏集数据失败:', error)
      return null
    }
  }

  /**
   * 获取奇物信息
   */
  async getArtifactById(artifactId) {
    try {
      const data = require('../../static/data/artifacts.json')
      const list = Array.isArray(data) ? data : (data.default || [])
      return list.find(artifact => artifact.id === artifactId)
    } catch (error) {
      console.error('加载奇物数据失败:', error)
      return null
    }
  }

  /**
   * 更新玩家收藏集进度
   */
  updateCollectionProgress(playerId, artifact) {
    const player = this.gameState.players.find(p => p.id === playerId)
    if (!player) return

    // 更新对应收藏集进度
    artifact.collectionTags.forEach(tag => {
      if (player.collections.hasOwnProperty(tag)) {
        player.collections[tag]++
      }
    })
  }

  /**
   * 添加游戏日志
   */
  addGameLog(message) {
    this.gameState.gameLog.push({
      timestamp: Date.now(),
      message: message
    })
  }

  /**
   * 获取游戏状态
   */
  getGameState() {
    return this.gameState
  }

  /**
   * 获取玩家信息
   */
  getPlayer(playerId) {
    return this.gameState.players.find(p => p.id === playerId)
  }

  /**
   * 更新玩家能量
   */
  updatePlayerEnergy(playerId, energyChange) {
    const player = this.getPlayer(playerId)
    if (player) {
      player.energy = Math.max(0, player.energy + energyChange)
      this.addGameLog(`${player.name} 的能量变化: ${energyChange > 0 ? '+' : ''}${energyChange}`)
    }
  }

  /**
   * 添加奇物到玩家
   */
  addArtifactToPlayer(playerId, artifact) {
    const player = this.getPlayer(playerId)
    if (player) {
      player.artifacts.push(artifact.id)
      this.updateCollectionProgress(playerId, artifact)
      this.addGameLog(`${player.name} 获得了奇物: ${artifact.name}`)
    }
  }

  /**
   * 从玩家移除奇物
   */
  removeArtifactFromPlayer(playerId, artifactId) {
    const player = this.getPlayer(playerId)
    if (player) {
      const index = player.artifacts.indexOf(artifactId)
      if (index > -1) {
        player.artifacts.splice(index, 1)
        this.addGameLog(`${player.name} 失去了奇物`)
      }
    }
  }
}

export default new GameStateService()
