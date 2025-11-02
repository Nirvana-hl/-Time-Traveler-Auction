<template>
  <view class="shop-page">
    <view class="shop-header">
      <text class="page-title">道具商店</text>
      <view class="player-info">
        <text class="player-name">{{ currentPlayer.name }}</text>
        <view class="energy-display">
          <text class="energy-icon">⚡</text>
          <text class="energy-value">{{ currentPlayer.energy }}</text>
        </view>
      </view>
    </view>

    <view class="shop-content">
      <!-- 道具分类 -->
      <view class="category-tabs">
        <view 
          v-for="category in categories" 
          :key="category"
          class="category-tab"
          :class="{ active: selectedCategory === category }"
          @click="selectCategory(category)"
        >
          {{ category }}
        </view>
      </view>

      <!-- 道具列表 -->
      <view class="items-list">
        <view 
          v-for="item in filteredItems" 
          :key="item.id"
          class="item-card"
        >
          <image 
            class="item-icon" 
            :src="item.icon" 
            mode="aspectFit"
          />
          <view class="item-details">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-description">{{ item.description }}</text>
            <view class="item-meta">
              <text class="item-price">{{ item.price }} 能量</text>
              <text class="item-type">{{ item.type }}</text>
            </view>
          </view>
          <button 
            class="buy-button"
            @click="buyItem(item)"
            :disabled="!canBuyItem(item)"
          >
            {{ getBuyButtonText(item) }}
          </button>
        </view>
      </view>
    </view>

    <!-- 我的道具 -->
    <view class="my-items">
      <text class="section-title">我的道具 ({{ playerItems.length }}/5)</text>
      <view class="items-grid">
        <view 
          v-for="item in playerItems" 
          :key="item.id"
          class="player-item"
          @click="useItem(item)"
        >
          <image 
            class="item-icon-small" 
            :src="item.icon" 
            mode="aspectFit"
          />
          <text class="item-name-small">{{ item.name }}</text>
          <text class="item-type-small">{{ item.type }}</text>
        </view>
      </view>
    </view>

    <!-- 购买确认弹窗 -->
    <uni-popup ref="buyConfirmPopup" type="center">
      <view class="buy-confirm-popup">
        <text class="confirm-title">确认购买</text>
        <view class="confirm-content">
          <image 
            class="confirm-icon" 
            :src="selectedItem.icon" 
            mode="aspectFit"
          />
          <view class="confirm-details">
            <text class="confirm-name">{{ selectedItem.name }}</text>
            <text class="confirm-price">价格: {{ selectedItem.price }} 能量</text>
            <text class="confirm-description">{{ selectedItem.description }}</text>
          </view>
        </view>
        <view class="confirm-buttons">
          <button class="cancel-button" @click="cancelBuy">取消</button>
          <button class="confirm-button" @click="confirmBuy">确认购买</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'vuex'
import itemService from '../../services/item-service.js'

export default {
  name: 'ShopPage',
  data() {
    return {
      items: [],
      playerItems: [],
      categories: ['全部', '破坏', '控制', '经济', '增益'],
      selectedCategory: '全部',
      selectedItem: null
    }
  },
  computed: {
    ...mapState(['currentPlayer']),
    
    filteredItems() {
      if (this.selectedCategory === '全部') {
        return this.items
      }
      return this.items.filter(item => item.type === this.selectedCategory)
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      await this.loadItems()
      await this.loadPlayerItems()
    },
    
    async loadItems() {
      this.items = itemService.getItems()
    },
    
    async loadPlayerItems() {
      if (this.currentPlayer) {
        this.playerItems = itemService.getPlayerItems(this.currentPlayer.id)
      }
    },
    
    selectCategory(category) {
      this.selectedCategory = category
    },
    
    canBuyItem(item) {
      return this.currentPlayer.energy >= item.price && 
             this.playerItems.length < 5
    },
    
    getBuyButtonText(item) {
      if (this.currentPlayer.energy < item.price) {
        return '能量不足'
      }
      if (this.playerItems.length >= 5) {
        return '道具栏已满'
      }
      return '购买'
    },
    
    buyItem(item) {
      this.selectedItem = item
      this.$refs.buyConfirmPopup.open()
    },
    
    async confirmBuy() {
      if (!this.selectedItem) return
      
      try {
        const result = await this.$store.dispatch('buyItem', {
          playerId: this.currentPlayer.id,
          itemId: this.selectedItem.id
        })
        
        this.$store.commit('SET_PLAYER_ENERGY', result.remainingEnergy)
        await this.loadPlayerItems()
        
        this.$refs.buyConfirmPopup.close()
        this.selectedItem = null
        
        uni.showToast({
          title: '购买成功',
          icon: 'success'
        })
      } catch (error) {
        uni.showToast({
          title: error.message || '购买失败',
          icon: 'none'
        })
      }
    },
    
    cancelBuy() {
      this.$refs.buyConfirmPopup.close()
      this.selectedItem = null
    },
    
    async useItem(item) {
      uni.showModal({
        title: '使用道具',
        content: `确定要使用 ${item.name} 吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await this.$store.dispatch('useItem', {
                playerId: this.currentPlayer.id,
                itemId: item.id
              })
              
              await this.loadPlayerItems()
              
              uni.showToast({
                title: result.message || '道具使用成功',
                icon: 'success'
              })
            } catch (error) {
              uni.showToast({
                title: error.message || '道具使用失败',
                icon: 'none'
              })
            }
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.shop-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.shop-header {
  background: #fff;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.player-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.player-name {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.energy-display {
  display: flex;
  align-items: center;
  background: #fff3e0;
  padding: 4px 12px;
  border-radius: 16px;
}

.energy-icon {
  font-size: 16px;
  margin-right: 4px;
}

.energy-value {
  font-size: 16px;
  font-weight: bold;
  color: #ff9800;
}

.shop-content {
  background: #fff;
  margin: 16px;
  border-radius: 12px;
  padding: 16px;
}

.category-tabs {
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.category-tab {
  padding: 8px 16px;
  margin-right: 8px;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  background: #f8f9fa;
}

.category-tab.active {
  background: #4caf50;
  color: white;
}

.items-list {
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
  width: 48px;
  height: 48px;
  margin-right: 12px;
}

.item-details {
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.item-description {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 8px;
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
}

.buy-button:disabled {
  background: #ccc;
}

.my-items {
  background: #fff;
  margin: 16px;
  border-radius: 12px;
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.items-grid {
  display: flex;
  flex-wrap: wrap;
}

.player-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
  padding: 8px;
  margin: 4px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #f8f9fa;
}

.item-icon-small {
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
}

.item-name-small {
  font-size: 10px;
  color: #333;
  text-align: center;
  margin-bottom: 2px;
}

.item-type-small {
  font-size: 8px;
  color: #999;
  text-align: center;
}

.buy-confirm-popup {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  max-width: 80vw;
}

.confirm-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 16px;
  display: block;
}

.confirm-content {
  display: flex;
  margin-bottom: 20px;
}

.confirm-icon {
  width: 60px;
  height: 60px;
  margin-right: 12px;
}

.confirm-details {
  flex: 1;
}

.confirm-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4px;
}

.confirm-price {
  font-size: 14px;
  color: #ff9800;
  font-weight: bold;
  display: block;
  margin-bottom: 8px;
}

.confirm-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
}

.cancel-button {
  flex: 1;
  background: #ccc;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
}

.confirm-button {
  flex: 1;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
}
</style>
