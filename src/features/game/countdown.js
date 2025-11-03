// 统一倒计时工具：负责启动/清理一个可重复使用的 interval 计时器

/**
 * 启动倒计时
 * @param {Object} options
 * @param {number} options.seconds - 初始秒数
 * @param {(remaining:number)=>void} options.onTick - 每秒回调（传入剩余秒数）
 * @param {()=>void} options.onDone - 结束回调
 * @param {()=>number|null} options.getRef - 获取当前 interval 引用（外部持有）
 * @param {(id:number|null)=>void} options.setRef - 写入 interval 引用
 */
export function startCountdown({ seconds, onTick, onDone, getRef, setRef }) {
  // 清理已有计时器
  const existing = getRef && getRef()
  if (existing) {
    clearInterval(existing)
    setRef && setRef(null)
  }

  let remaining = Number(seconds) || 0
  onTick && onTick(remaining)

  const id = setInterval(async () => {
    remaining = remaining - 1
    onTick && onTick(remaining)
    if (remaining <= 0) {
      clearInterval(id)
      setRef && setRef(null)
      if (onDone) await onDone()
    }
  }, 1000)

  setRef && setRef(id)
}

/**
 * 清理倒计时
 * @param {()=>number|null} getRef
 * @param {(id:number|null)=>void} setRef
 */
export function clearCountdown(getRef, setRef) {
  const existing = getRef && getRef()
  if (existing) {
    clearInterval(existing)
    setRef && setRef(null)
  }
}


