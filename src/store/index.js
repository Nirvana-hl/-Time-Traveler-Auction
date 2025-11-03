import Vue from 'vue'
import Vuex from 'vuex'
import auctionService from '../services/auction-service.js'
import auctionPersist from '../services/auction-persist-service.js'
import itemService from '../services/item-service.js'
import gameStateService from '../services/game-state-service.js'
import { getSupabase } from '../services/supabase-client.js'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    // 游戏状态
    gamePhase: 'preparation', // preparation, auction, item, settlement
    players: [],
    currentAuctions: [],
    gameLog: [],
    
    // UI状态
    showCardDetail: false,
    selectedCard: null,
    showShop: false,
    
    // 玩家数据
    currentPlayer: null,
    playerEnergy: 50,
    playerArtifacts: [],
    playerItems: [],

    // auth & room
    user: null,
    roomId: null
  },
  
  mutations: {
    // 游戏状态相关
    SET_GAME_PHASE(state, phase) {
      state.gamePhase = phase
    },
    
    SET_PLAYERS(state, players) {
      state.players = players
    },
    
    SET_CURRENT_AUCTIONS(state, auctions) {
      state.currentAuctions = auctions
    },
    ADD_OR_UPDATE_AUCTION(state, auction) {
      const idx = state.currentAuctions.findIndex(a => a.id === auction.id)
      if (idx >= 0) Vue.set(state.currentAuctions, idx, auction)
      else state.currentAuctions.push(auction)
    },
    REMOVE_AUCTION(state, auctionId) {
      state.currentAuctions = state.currentAuctions.filter(a => a.id !== auctionId)
    },
    
    ADD_GAME_LOG(state, log) {
      state.gameLog.push(log)
    },
    
    // UI状态相关
    SET_SHOW_CARD_DETAIL(state, show) {
      state.showCardDetail = show
    },
    
    SET_SELECTED_CARD(state, card) {
      state.selectedCard = card
    },
    
    SET_SHOW_SHOP(state, show) {
      state.showShop = show
    },
    
    // 玩家数据相关
    SET_CURRENT_PLAYER(state, player) {
      state.currentPlayer = player
    },
    
    SET_PLAYER_ENERGY(state, energy) {
      state.playerEnergy = energy
    },
    
    SET_PLAYER_ARTIFACTS(state, artifacts) {
      state.playerArtifacts = artifacts
    },
    
    SET_PLAYER_ITEMS(state, items) {
      state.playerItems = items
    },

    SET_USER(state, user) {
      if (!user) {
        state.user = null
        return
      }
      const previous = state.user || {}
      const next = { ...previous, ...user }
      // Preserve existing profile fields if incoming payload lacks them or sets them to null/undefined
      if (user.username === undefined || user.username === null) {
        next.username = previous.username
      }
      if (user.avatar === undefined || user.avatar === null) {
        next.avatar = previous.avatar
      }
      state.user = next
    },

    SET_ROOM_ID(state, roomId) {
      state.roomId = roomId
    }
  },
  
  actions: {
    // 初始化游戏
    async initializeGame({ commit }, playerNames) {
      const gameState = gameStateService.initializeGame(playerNames)
      commit('SET_GAME_PHASE', gameState.phase)
      commit('SET_PLAYERS', gameState.players)
      commit('SET_CURRENT_PLAYER', gameState.players[0])
      commit('SET_PLAYER_ENERGY', 50)
      return gameState
    },
    
    // 开始拍卖
    async startAuction({ commit, state }, artifact) {
      // 以数据库商品为准创建一条拍卖，默认30s
      const auction = auctionService.startAuction(artifact, 30)
      commit('ADD_OR_UPDATE_AUCTION', auction)
      commit('SET_GAME_PHASE', 'auction')
      // 持久化到 DB（带 room_id），作为拍卖的来源事实表
      if (state.roomId) await auctionPersist.upsertAuction(state.roomId, auction)
      return auction
    },
    
    // 出价
    async placeBid({ commit, state }, { auctionId, playerId, playerName, bidAmount }) {
      try {
        // 确保内存中的拍卖存在（从数据库同步的拍卖不会自动进入 auctionService）
        let svcAuction = auctionService.getAuctionById(auctionId)
        if (!svcAuction) {
          const storeAuction = (state.currentAuctions || []).find(a => a.id === auctionId)
          if (storeAuction) {
            // 以最小必要字段注册到服务，避免双重计时器
            auctionService.currentAuctions.push({
              id: storeAuction.id,
              artifact: storeAuction.artifact,
              highestBid: storeAuction.highestBid || 0,
              highestBidder: storeAuction.highestBidder || null,
              timeRemaining: typeof storeAuction.timeRemaining === 'number' ? storeAuction.timeRemaining : 30,
              timeLimit: typeof storeAuction.timeLimit === 'number' ? storeAuction.timeLimit : 30,
              bids: storeAuction.bids || [],
              startTime: storeAuction.startTime || Date.now(),
              status: storeAuction.status || 'active',
              _timer: null
            })
            svcAuction = auctionService.getAuctionById(auctionId)
          }
        }
        const bid = auctionService.placeBid(auctionId, playerId, playerName, bidAmount)
        const updated = auctionService.getAuctionById(auctionId)
        commit('ADD_OR_UPDATE_AUCTION', updated)
        if (state.roomId) await auctionPersist.updateBid(state.roomId, auctionId, updated.highestBid, updated.highestBidder)
        // 广播出价事件到房间（让其他玩家实时看到最新价格）
        try {
          const supabase = getSupabase()
          const rid = state.roomId
          if (rid) {
            await supabase.channel(`room_cast_${rid}`).send({
              type: 'broadcast',
              event: 'auction_bid_update',
              payload: { auctionId, highestBid: updated.highestBid, highestBidder: updated.highestBidder, playerName }
            })
          }
        } catch (_) {}
        return bid
      } catch (error) {
        throw error
      }
    },
    
    // 结束拍卖（多件拍卖，按ID结束对应拍卖）
    async endAuction({ commit, state }, auctionId) {
      // 优先使用内存服务结算
      let result = auctionService.endAuction(auctionId)

      // 若服务中不存在该拍卖（例如从DB同步但未出价注入服务的情形），
      // 则直接基于store中的拍卖生成结算结果并持久化
      if (!result) {
        const storeAuction = (state.currentAuctions || []).find(a => a.id === auctionId)
        if (!storeAuction) return null
        result = {
          id: storeAuction.id,
          winner: storeAuction.highestBidder || null,
          winningBid: storeAuction.highestBid || 0,
          artifact: storeAuction.artifact
        }
      }

      const endedAuction = { id: result.id, artifact: result.artifact, highestBid: result.winningBid, highestBidder: result.winner, status: 'ended', timeRemaining: 0 }
      if (state.roomId) await auctionPersist.endAuction(state.roomId, endedAuction)

      // 以数据库为准进行归属，前端不直接给本地玩家手牌加卡；改为广播并让各客户端刷新房间状态
      try {
        const rid = state.roomId
        if (rid) {
          const supabase = getSupabase()
          await supabase.channel(`room_cast_${rid}`).send({
            type: 'broadcast',
            event: 'auction_ended',
            payload: { auctionId: result.id }
          })
        }
      } catch (_) {}

      // 添加游戏日志（提示结束结果，名称可能需要房间状态刷新后才能完整呈现）
      if (result.winner) {
        commit('ADD_GAME_LOG', { timestamp: Date.now(), message: `拍卖结束：${result.artifact.name} 归属最高出价者` })
      } else {
        commit('ADD_GAME_LOG', { timestamp: Date.now(), message: `${result.artifact.name} 本轮流拍` })
      }
      // 移除本地拍卖
      commit('REMOVE_AUCTION', result.id)
      // 立即刷新当前用户手牌（避免必须刷新页面）
      try {
        const supabase = getSupabase()
        const uid = state.user && state.user.id
        const rid = state.roomId
        if (uid && rid) {
          const { data: owned } = await supabase
            .from('room_artifacts')
            .select('artifact_id')
            .eq('room_id', rid)
            .eq('owner_user_id', uid)
          const aids = (owned || []).map(r => r.artifact_id)
          if (state.currentPlayer) {
            const next = { ...state.currentPlayer, artifacts: aids }
            commit('SET_CURRENT_PLAYER', next)
          }
          commit('SET_PLAYER_ARTIFACTS', aids)
        }
      } catch (_) {}
      return result
    },
    
    // 购买道具
    async buyItem({ commit, state }, { playerId, itemId }) {
      try {
        const result = itemService.buyItem(playerId, itemId, state.playerEnergy)
        commit('SET_PLAYER_ENERGY', result.remainingEnergy)
        return result
      } catch (error) {
        throw error
      }
    },
    
    // 使用道具
    async useItem({ commit, state }, { playerId, itemId, target }) {
      try {
        const result = itemService.useItem(playerId, itemId, target)
        return result
      } catch (error) {
        throw error
      }
    },
    
    // 显示卡牌详情
    showCardDetail({ commit }, card) {
      commit('SET_SELECTED_CARD', card)
      commit('SET_SHOW_CARD_DETAIL', true)
    },
    
    // 隐藏卡牌详情
    hideCardDetail({ commit }) {
      commit('SET_SHOW_CARD_DETAIL', false)
      commit('SET_SELECTED_CARD', null)
    },
    
    // 显示商店
    showShop({ commit }) {
      commit('SET_SHOW_SHOP', true)
    },
    
    // 隐藏商店
    hideShop({ commit }) {
      commit('SET_SHOW_SHOP', false)
    },
    
    // 更新游戏状态
    updateGameState({ commit }, newState) {
      if (newState.phase) commit('SET_GAME_PHASE', newState.phase)
      if (newState.players) commit('SET_PLAYERS', newState.players)
      if (newState.currentAuctions) commit('SET_CURRENT_AUCTIONS', newState.currentAuctions)
    }
  },
  
  getters: {
    // 游戏状态
    isGameActive: state => state.gamePhase !== 'settlement',
    isAuctionPhase: state => state.gamePhase === 'auction',
    isItemPhase: state => state.gamePhase === 'item',
    
    // 当前拍卖信息（列表）
    currentAuctionsInfo: state => {
      return (state.currentAuctions || []).map(a => ({
        id: a.id,
        artifact: a.artifact,
        highestBid: a.highestBid,
        timeRemaining: a.timeRemaining,
        bidCount: a.bids.length
      }))
    },
    
    // 玩家信息
    currentPlayerInfo: state => {
      if (!state.currentPlayer) return null
      return {
        id: state.currentPlayer.id,
        name: state.currentPlayer.name,
        energy: state.playerEnergy,
        artifacts: state.playerArtifacts,
        items: state.playerItems
      }
    },
    
    // 游戏日志
    recentGameLog: state => state.gameLog.slice(-10)
  }
})

export default store
