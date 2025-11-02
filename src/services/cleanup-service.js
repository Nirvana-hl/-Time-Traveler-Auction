import roomService from './room-service'

class CleanupService {
  constructor() {
    this.cleanupInterval = null
    this.isRunning = false
  }

  // 启动定期清理
  startCleanup(intervalMinutes = 5) {
    if (this.isRunning) {
      console.warn('清理服务已在运行中')
      return
    }

    this.isRunning = true
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup()
      } catch (error) {
        console.error('清理空房间时出错:', error)
      }
    }, intervalMinutes * 60 * 1000)

    console.log(`房间清理服务已启动，每${intervalMinutes}分钟清理一次`)
  }

  // 停止定期清理
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      this.isRunning = false
      console.log('房间清理服务已停止')
    }
  }

  // 执行清理
  async performCleanup() {
    try {
      await roomService.cleanupEmptyRooms()
      console.log('空房间清理完成')
    } catch (error) {
      console.error('清理空房间失败:', error)
    }
  }

  // 手动执行一次清理
  async manualCleanup() {
    await this.performCleanup()
  }
}

export default new CleanupService()
