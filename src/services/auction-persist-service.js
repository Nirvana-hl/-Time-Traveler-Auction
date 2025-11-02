import { getSupabase } from './supabase-client'

class AuctionPersistService {
  async upsertAuction(roomId, auction) {
    const supabase = getSupabase()
    // 避免同一房间同一拍卖品重复（仅针对 active 状态）
    const { data: existing } = await supabase
      .from('auctions')
      .select('id')
      .eq('room_id', roomId)
      .eq('artifact_id', auction.artifact.id)
      .eq('status', 'active')
      .limit(1)
    if (existing && existing.length) {
      // 已存在活动拍卖，直接返回原拍卖对象，不再写入重复记录
      return auction
    }
    const { error } = await supabase
      .from('auctions')
      .upsert({
        room_id: roomId,
        id: auction.id,
        artifact_id: auction.artifact.id,
        artifact: auction.artifact,
        highest_bid: auction.highestBid,
        highest_bidder: auction.highestBidder,
        time_remaining: auction.timeRemaining,
        status: auction.status
      })
    if (error) throw error
    return auction
  }

  async updateBid(roomId, auctionId, highestBid, highestBidder) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('auctions')
      .update({ highest_bid: highestBid, highest_bidder: highestBidder })
      .eq('id', auctionId)
    if (error) throw error
  }

  async endAuction(roomId, auction) {
    const supabase = getSupabase()
    // 原子性结束：仅当拍卖仍为 active 时才执行结束与归属，避免重复插入
    const { data: updatedRows, error: endErr } = await supabase
      .from('auctions')
      .update({ status: 'ended', time_remaining: 0 })
      .eq('id', auction.id)
      .eq('status', 'active')
      .select('id, artifact_id, artifact, highest_bid, highest_bidder')
    if (endErr) throw endErr

    // 若无行被更新：说明已结束或不存在，直接返回，不再重复写历史/归属
    if (!updatedRows || updatedRows.length === 0) {
      return
    }

    const row = updatedRows[0]
    const finalWinner = row && row.highest_bidder ? row.highest_bidder : null
    const finalBid = row && typeof row.highest_bid === 'number' ? row.highest_bid : 0
    const artifactId = row && row.artifact_id
    const artifact = row && row.artifact ? row.artifact : (auction.artifact || { id: artifactId })

    // 写入拍卖历史（以DB结果为准）
    const { error: herr } = await supabase
      .from('auction_history')
      .insert({
        auction_id: auction.id,
        artifact_id: artifactId || (artifact && artifact.id),
        artifact: artifact,
        winner: finalWinner,
        winning_bid: finalBid
      })
    if (herr) throw herr

    // 若最终有获胜者，则将该商品归入其房间手牌（room_artifacts），一次性插入
    if (finalWinner && (artifactId || (artifact && artifact.id))) {
      const { error: aerr } = await supabase
        .from('room_artifacts')
        .insert({
          room_id: roomId,
          owner_user_id: finalWinner,
          artifact_id: artifactId || artifact.id
        })
      if (aerr) throw aerr
    }

    // 删除本轮拍卖行（幂等，重复调用不会影响数据正确性）
    await supabase.from('auctions').delete().eq('id', auction.id)
  }
}

export default new AuctionPersistService()
