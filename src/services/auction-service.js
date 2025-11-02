/**
 * 拍卖服务
 */
class AuctionService {
  constructor() {
    this.currentAuctions = [] // 支持多件同时拍卖
    this.auctionHistory = []
    this.defaultTimeLimit = 30 // 默认60秒
  }

  /**
   * 开始拍卖
   * @param {Object} artifact - 要拍卖的奇物
   * @param {number} timeLimit - 拍卖时间限制（秒）
   */
  startAuction(artifact, timeLimit = this.defaultTimeLimit) {
    const auction = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      artifact: artifact,
      highestBid: 0,
      highestBidder: null,
      timeRemaining: timeLimit,
      timeLimit: timeLimit,
      bids: [],
      startTime: Date.now(),
      status: 'active',
      _timer: null
    }
    this.currentAuctions.push(auction)
    // 开始倒计时
    this.startCountdown(auction)
    return auction
  }

  /**
   * 出价
   * @param {string} playerId - 玩家ID
   * @param {string} playerName - 玩家名称
   * @param {number} bidAmount - 出价金额
   */
  placeBid(auctionId, playerId, playerName, bidAmount) {
    const auction = this.getAuctionById(auctionId)
    if (!auction || auction.status !== 'active') {
      throw new Error('当前没有活跃的拍卖')
    }
    if (bidAmount <= auction.highestBid) {
      throw new Error('出价必须高于当前最高价')
    }
    const bid = { playerId, playerName, amount: bidAmount, timestamp: Date.now() }
    auction.bids.push(bid)
    auction.highestBid = bidAmount
    auction.highestBidder = playerId
    return bid
  }

  /**
   * 结束拍卖
   */
   endAuction(auctionId) {
    const auction = this.getAuctionById(auctionId)
    if (!auction) return null
    auction.status = 'ended'
    auction.endTime = Date.now()
    if (auction._timer) {
      clearInterval(auction._timer)
      auction._timer = null
    }
    // 记录到历史
    this.auctionHistory.push({ ...auction })
    const result = {
      id: auction.id,
      winner: auction.highestBidder,
      winningBid: auction.highestBid,
      artifact: auction.artifact
    }
    // 从当前列表移除
    this.currentAuctions = this.currentAuctions.filter(a => a.id !== auctionId)
    return result
  }

  /**
   * 开始倒计时
   */
  startCountdown(auction) {
    if (!auction) return
    auction._timer = setInterval(() => {
      if (!auction || auction.status !== 'active') {
        clearInterval(auction._timer)
        auction._timer = null
        return
      }
      auction.timeRemaining--
      if (auction.timeRemaining <= 0) {
        clearInterval(auction._timer)
        auction._timer = null
        this.endAuction(auction.id)
      }
    }, 1000)
  }

  /**
   * 获取当前拍卖状态
   */
  getCurrentAuctions() {
    return this.currentAuctions
  }

  getAuctionById(auctionId) {
    return this.currentAuctions.find(a => a.id === auctionId)
  }

  /**
   * 获取拍卖历史
   */
  getAuctionHistory() {
    return this.auctionHistory
  }

  /**
   * 停止并清空所有本地拍卖计时器（用于房间被清空或页面退出）
   */
  stopAll() {
    try {
      for (const a of this.currentAuctions) {
        if (a && a._timer) { clearInterval(a._timer); a._timer = null }
        a.status = 'ended'
      }
    } catch (_) {}
    this.currentAuctions = []
  }
}

export default new AuctionService()
