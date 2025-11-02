<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* 全局样式 */
body {
  /* 深色奇幻风背景：星空+微光 */
  background: radial-gradient(1400px circle at 15% 0%, #0b1220, #0f172a),
              radial-gradient(900px circle at 85% 25%, rgba(99,102,241,0.12), rgba(99,102,241,0)),
              radial-gradient(700px circle at 10% 80%, rgba(16,185,129,0.10), rgba(16,185,129,0));
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  margin: 0;
  padding: 0;
}

#app {
  min-height: 100vh;
}

/* 通用按钮样式 */
button {
  border: none;
  outline: none;
  cursor: pointer;
}

/* 通用输入框样式 */
input {
  border: none;
  outline: none;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
