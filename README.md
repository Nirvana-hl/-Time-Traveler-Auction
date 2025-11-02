# 时空旅人拍卖会

一款结合实体卡牌与数字技术的创新线下桌游，基于UniApp框架开发，支持微信小程序、支付宝小程序和H5多端运行。

## 项目概述

"时空旅人拍卖会"是一款创新的桌游应用，玩家扮演来自不同时空的旅人，通过竞拍散落在时空中的"奇物"来构建自己的收藏集，争夺"时空影响力"的最高荣誉。

## 技术栈

- **前端框架**: UniApp (Vue.js)
- **状态管理**: Vuex
- **平台支持**: 微信小程序、支付宝小程序、H5
- **开发工具**: HBuilderX / Vue CLI

## 功能特性

### 核心功能
- 🎮 **实时拍卖系统**: 支持多玩家同时竞拍
- 🃏 **卡牌信息管理**: 点击卡牌查看详细信息
- 🛒 **道具商店系统**: 购买和使用各种道具
- 📚 **收藏集追踪**: 实时更新收藏集完成进度
- 📊 **游戏状态管理**: 完整的游戏流程控制

### 游戏机制
- **拍卖阶段**: 玩家出价竞拍奇物
- **道具阶段**: 购买和使用道具影响游戏
- **收藏集系统**: 完成特定收藏集获得奖励分数
- **胜利条件**: 总分最高者获胜

## 项目结构

```
src/
├── pages/                    # 页面
│   ├── index/               # 主游戏页面
│   ├── card-detail/         # 卡牌详情页面
│   ├── shop/                # 道具商店页面
│   └── collection/          # 收藏集页面
├── components/              # 组件
│   ├── auction-panel/      # 拍卖面板
│   ├── item-shop/          # 道具商店
│   ├── player-panel/       # 玩家信息
│   └── card-item/          # 卡牌项
├── services/               # 服务层
│   ├── auction-service.js  # 拍卖逻辑
│   ├── item-service.js     # 道具逻辑
│   └── game-state-service.js # 游戏状态管理
├── store/                  # 状态管理
│   └── index.js           # Vuex配置
├── utils/                  # 工具函数
│   ├── game-utils.js       # 游戏工具
│   └── storage-utils.js   # 存储工具
└── static/                 # 静态资源
    ├── data/              # 数据文件
    └── images/            # 图片资源
```

## 安装和运行

### 环境要求
- Node.js 14+
- HBuilderX 或 Vue CLI
- 微信开发者工具（小程序开发）

### 安装依赖
```bash
npm install
```

### 开发运行
```bash
# H5开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# 支付宝小程序开发
npm run dev:mp-alipay
```

### 构建发布
```bash
# H5构建
npm run build:h5

# 微信小程序构建
npm run build:mp-weixin

# 支付宝小程序构建
npm run build:mp-alipay
```

## 数据模型

### 奇物数据结构
```javascript
{
  id: "artifact_001",
  name: "唐代秘色瓷",
  era: "唐代(618-907)",
  location: "中国",
  story: "一段生动的背景故事...",
  collectionTags: ["艺术瑰宝", "东方文明"],
  baseValue: 8,
  image: "/static/images/artifacts/artifact_001.jpg"
}
```

### 道具数据结构
```javascript
{
  id: "item_001",
  name: "时空乱流",
  price: 15,
  description: "强制一名对手将一张奇物放回牌堆",
  type: "破坏",
  targetType: "player_artifact",
  useTiming: "anytime",
  effect: "return_artifact",
  icon: "/static/images/items/item_001.png"
}
```

### 玩家数据结构
```javascript
{
  id: "player_001",
  name: "玩家名称",
  energy: 50,
  artifacts: ["artifact_001", "artifact_005"],
  items: ["item_001", "item_003"],
  collections: {
    "艺术瑰宝": 2,
    "科技奇点": 1
  }
}
```

## 游戏规则

### 基础规则
1. **准备阶段**: 分配初始能量，洗牌
2. **回合循环**:
   - 道具阶段: 玩家可购买/使用道具
   - 拍卖阶段: 竞拍当前奇物
   - 状态更新: 更新收藏集进度
3. **结束阶段**: 所有卡牌拍卖完毕后结算

### 胜利条件
- 完成收藏集获得基础分数
- 零散奇物获得一半价值分数
- 总分最高者获胜

### 道具规则
- 每回合限购2个道具
- 道具栏上限: 5个道具
- 同类道具持有上限: 2个

## 开发指南

### 添加新奇物
1. 在 `static/data/artifacts.json` 中添加奇物数据
2. 添加对应的图片资源到 `static/images/artifacts/`
3. 确保数据格式符合奇物数据结构

### 添加新道具
1. 在 `static/data/items.json` 中添加道具数据
2. 在 `services/item-service.js` 中实现道具效果
3. 添加对应的图标资源到 `static/images/items/`

### 自定义收藏集
1. 在 `static/data/collections.json` 中配置收藏集
2. 确保奇物的 `collectionTags` 包含相应标签
3. 更新游戏逻辑以支持新的收藏集

## 部署说明

### 微信小程序
1. 使用微信开发者工具打开项目
2. 配置小程序AppID
3. 上传代码并提交审核

### 支付宝小程序
1. 使用支付宝开发者工具打开项目
2. 配置小程序AppID
3. 上传代码并提交审核

### H5部署
1. 构建H5版本: `npm run build:h5`
2. 将 `dist` 目录部署到Web服务器
3. 配置HTTPS（小程序要求）

## 性能优化

- 图片懒加载和压缩
- 数据分页加载
- 组件按需引入
- 缓存策略优化

## 浏览器兼容性

- iOS Safari 12+
- Android Chrome 70+
- 微信小程序基础库 2.0+
- 支付宝小程序基础库 1.0+

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: your-email@example.com

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 实现基础拍卖功能
- 支持道具商店系统
- 完成收藏集追踪功能
- 支持多端部署
