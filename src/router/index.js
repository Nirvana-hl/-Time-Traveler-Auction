import Vue from 'vue'
import VueRouter from 'vue-router'
import GameIndex from '../pages/index/index.vue'
import CardDetail from '../pages/card-detail/card-detail.vue'
import Collection from '../pages/collection/collection.vue'
import Login from '../pages/auth/login.vue'
import Rooms from '../pages/rooms/rooms.vue'
import CreateRoom from '../pages/create-room/create-room.vue'
import Menu from '../pages/menu/menu.vue'
import Profile from '../pages/profile/profile.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    alias: ['/menu'],
    name: 'Menu',
    component: Menu
  },
  {
    path: '/card-detail',
    name: 'CardDetail',
    component: CardDetail
  },
  {
    path: '/collection',
    name: 'Collection',
    component: Collection
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/rooms',
    name: 'Rooms',
    component: Rooms
  },
  {
    path: '/create-room',
    name: 'CreateRoom',
    component: CreateRoom
  },
  {
    path: '/game',
    name: 'GameIndex',
    component: GameIndex
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  },
  { path: '*', redirect: '/' }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

// 路由守卫：菜单与登录允许匿名；房间与游戏必须登录
import authService from '../services/auth-service'
import store from '../store'
const publicPaths = ['/menu', '/login', '/rooms']
router.beforeEach(async (to, from, next) => {
  if (publicPaths.includes(to.path)) return next()
  try {
    const user = await authService.getUser()
    if (user && !store.state.user) store.commit('SET_USER', user)
    if (!user) return next('/login')
    next()
  } catch (e) {
    console.error('[router guard] error', e)
    return next('/login')
  }
})

export default router