import Vue from 'vue'
import App from './App.vue'
import store from './store'
import router from './router'
import cleanupService from './services/cleanup-service'

Vue.config.productionTip = false

// 启动房间清理服务
cleanupService.startCleanup(5) // 每5分钟清理一次

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount('#app')
