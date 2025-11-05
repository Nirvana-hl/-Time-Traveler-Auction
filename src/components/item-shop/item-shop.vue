<template>
    <div class="item-shop">
      <div class="shop-header">
        <h3 class="shop-title">道具商店</h3>
        <div class="player-energy">
          <span class="energy-label">当前能量:</span>
          <span class="energy-value">{{ playerEnergy }}</span>
        </div>
      </div>
      
      <div class="shop-content">
        <div 
          v-for="item in items" 
          :key="item.id"
          class="item-card"
        >
          <div class="item-icon">🎯</div>
          <div class="item-info">
            <h4 class="item-name">{{ item.name }}</h4>
            <p class="item-description">{{ item.description }}</p>
            <div class="item-meta">
              <span class="item-price">{{ item.price }} 能量</span>
              <span class="item-type">{{ item.type }}</span>
            </div>
          </div>
          <button 
            class="buy-button"
            @click="buyItem(item)"
            :disabled="!canBuyItem(item)"
          >
            购买
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { mapState } from 'vuex'
  
  export default {
    name: 'ItemShop',
    data() {
      return {
        items: [
          {
            id: "item_001",
            name: "时空乱流",
            price: 15,
            description: "强制一名对手将一张奇物放回牌堆",
            type: "破坏"
          },
          {
            id: "item_002",
            name: "赝品鉴定",
            price: 10,
            description: "当前拍卖的奇物流拍",
            type: "控制"
          },
          {
            id: "item_003",
            name: "时间冻结",
            price: 20,
            description: "延长当前拍卖时间30秒",
            type: "控制"
          }
        ]
      }
    },
    computed: {
      ...mapState(['playerEnergy', 'currentPlayer'])
    },
    methods: {
      canBuyItem(item) {
        return this.playerEnergy >= item.price
      },
      
      async buyItem(item) {
        if (!this.canBuyItem(item)) {
          alert('能量不足')
          return
        }
        
        try {
          const result = await this.$store.dispatch('buyItem', {
            playerId: this.currentPlayer.id,
            itemId: item.id
          })
          
          this.$store.commit('SET_PLAYER_ENERGY', result.remainingEnergy)
          
          alert('购买成功')
        } catch (error) {
          alert(error.message || '购买失败')
        }
      }
    }
  }
  </script>
  
  <style scoped>
  .item-shop {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    margin: 16px;
  }
  
  .shop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .shop-title {
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin: 0;
  }
  
  .player-energy {
    display: flex;
    align-items: center;
  }
  
  .energy-label {
    font-size: 14px;
    color: #666;
    margin-right: 4px;
  }
  
  .energy-value {
    font-size: 16px;
    font-weight: bold;
    color: #ff9800;
  }
  
  .shop-content {
    display: flex;
    flex-direction: column;
  }
  
  .item-card {
    display: flex;
    align-items: center;
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 8px;
    margin-bottom: 8px;
  }
  
  .item-icon {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .item-info {
    flex: 1;
  }
  
  .item-name {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin: 0 0 4px 0;
  }
  
  .item-description {
    font-size: 12px;
    color: #666;
    margin: 0 0 8px 0;
  }
  
  .item-meta {
    display: flex;
    justify-content: space-between;
  }
  
  .item-price {
    font-size: 14px;
    color: #ff9800;
    font-weight: bold;
  }
  
  .item-type {
    font-size: 12px;
    color: #999;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
  }
  
  .buy-button {
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
  }
  
  .buy-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  </style>