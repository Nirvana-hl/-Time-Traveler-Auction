/**
 * 道具服务
 */
class ItemService {
  constructor() {
    this.items = []
    this.playerItems = new Map() // 玩家道具库存
    this.loadItems()
  }

  /**
   * 加载道具数据
   */
  async loadItems() {
    try {
      const { getSupabase } = await import('./supabase-client')
      const supabase = getSupabase()
      const { data, error } = await supabase.from('items').select('*')
      if (error) throw error
      this.items = Array.isArray(data) ? data : []
    } catch (error) {
      console.error('加载道具数据失败:', error)
      this.items = []
    }
  }

  /**
   * 获取所有道具
   */
  getItems() {
    return this.items
  }

  /**
   * 根据ID获取道具
   */
  getItemById(itemId) {
    return this.items.find(item => item.id === itemId)
  }

  /**
   * 购买道具
   * @param {string} playerId - 玩家ID
   * @param {string} itemId - 道具ID
   * @param {number} playerEnergy - 玩家当前能量
   */
  buyItem(playerId, itemId, playerEnergy) {
    const item = this.getItemById(itemId)
    if (!item) {
      throw new Error('道具不存在')
    }

    if (playerEnergy < item.price) {
      throw new Error('能量不足')
    }

    // 检查道具栏上限
    const playerItemCount = this.getPlayerItemCount(playerId)
    if (playerItemCount >= 5) {
      throw new Error('道具栏已满')
    }

    // 检查同类道具持有上限
    const sameTypeCount = this.getPlayerItemCountByType(playerId, item.type)
    if (sameTypeCount >= 2) {
      throw new Error('同类道具持有已达上限')
    }

    // 添加道具到玩家库存
    if (!this.playerItems.has(playerId)) {
      this.playerItems.set(playerId, [])
    }
    
    this.playerItems.get(playerId).push({
      ...item,
      purchaseTime: Date.now()
    })

    return {
      success: true,
      item: item,
      remainingEnergy: playerEnergy - item.price
    }
  }

  /**
   * 使用道具
   * @param {string} playerId - 玩家ID
   * @param {string} itemId - 道具ID
   * @param {Object} target - 目标对象
   */
  useItem(playerId, itemId, target = null) {
    const playerItemList = this.playerItems.get(playerId) || []
    const playerItem = playerItemList.find(item => item.id === itemId)
    
    if (!playerItem) {
      throw new Error('道具不存在')
    }

    // 验证使用时机
    if (!this.validateUseTiming(playerItem, target)) {
      throw new Error('当前时机不能使用此道具')
    }

    // 执行道具效果
    const result = this.executeItemEffect(playerItem, target)
    
    // 移除已使用的道具
    const index = playerItemList.findIndex(item => item.id === itemId)
    playerItemList.splice(index, 1)

    return result
  }

  /**
   * 验证使用时机
   */
  validateUseTiming(item, target) {
    // 这里可以根据游戏状态和道具类型进行验证
    return true
  }

  /**
   * 执行道具效果
   */
  executeItemEffect(item, target) {
    switch (item.effect) {
      case 'return_artifact':
        return this.executeReturnArtifact(item, target)
      case 'cancel_auction':
        return this.executeCancelAuction(item, target)
      case 'extend_time':
        return this.executeExtendTime(item, target)
      case 'steal_energy':
        return this.executeStealEnergy(item, target)
      case 'double_auction':
        return this.executeDoubleAuction(item, target)
      default:
        throw new Error('未知的道具效果')
    }
  }

  /**
   * 执行时空乱流效果
   */
  executeReturnArtifact(item, target) {
    return {
      effect: 'return_artifact',
      message: '时空乱流发动！目标奇物被送回牌堆',
      target: target
    }
  }

  /**
   * 执行赝品鉴定效果
   */
  executeCancelAuction(item, target) {
    return {
      effect: 'cancel_auction',
      message: '赝品鉴定！当前拍卖被取消',
      target: target
    }
  }

  /**
   * 执行时间冻结效果
   */
  executeExtendTime(item, target) {
    return {
      effect: 'extend_time',
      message: '时间冻结！拍卖时间延长30秒',
      target: target,
      extendTime: 30
    }
  }

  /**
   * 执行能量窃取效果
   */
  executeStealEnergy(item, target) {
    return {
      effect: 'steal_energy',
      message: '能量窃取！从目标玩家处窃取5点能量',
      target: target,
      stealAmount: 5
    }
  }

  /**
   * 执行双倍拍品效果
   */
  executeDoubleAuction(item, target) {
    return {
      effect: 'double_auction',
      message: '双倍拍品！下次拍卖将出现两张奇物',
      target: target
    }
  }

  /**
   * 获取玩家道具数量
   */
  getPlayerItemCount(playerId) {
    const playerItemList = this.playerItems.get(playerId) || []
    return playerItemList.length
  }

  /**
   * 获取玩家某类型道具数量
   */
  getPlayerItemCountByType(playerId, type) {
    const playerItemList = this.playerItems.get(playerId) || []
    return playerItemList.filter(item => item.type === type).length
  }

  /**
   * 获取玩家道具列表
   */
  getPlayerItems(playerId) {
    return this.playerItems.get(playerId) || []
  }
}

export default new ItemService()
