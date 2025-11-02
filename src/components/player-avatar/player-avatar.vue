<template>
  <div class="player-avatar" @click="$router.push(`/player/${player.id}`)">
    <div class="avatar-wrap">
      <img class="avatar" src="https://via.placeholder.com/60x60?text=P" alt="avatar" />
      <span class="energy">⚡ {{ player.energy }}</span>
    </div>
    <div class="name">{{ player.name }}</div>
  </div>
</template>

<script>
export default {
  name: 'PlayerAvatar',
  props: {
    player: { type: Object, required: true }
  }
}
</script>

<style scoped>
.player-avatar { width: 100px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
.avatar-wrap { position:relative; }
.avatar { width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid #334155; }
.energy { position:absolute; bottom:-6px; right:-8px; background:#0f172a; color:#f59e0b; border:1px solid #1f2937; border-radius:10px; padding:2px 6px; font-size:12px; }
.name { color:#e2e8f0; font-size:13px; text-align:center; }
.player-avatar:hover .avatar { border-color:#3b82f6; }
</style>
