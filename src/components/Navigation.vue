<template>
  <div class="nav">
    Fake Logo
  </div>
</template>

<script>
export default {

}
</script>

<style lang="stylus" scoped>
.nav
  position fixed
  width 94vw 
  user-select none
  display flex
  justify-content space-between
  align-items center
  padding 20px 3vw
  z-index 998
  font-size 24px
  color rgba(255,255,255,.4)
  border-bottom 1px solid rgba(255,255,255,0.1)
  // background-color: rgba(41,46,73,.8)
  backdrop-filter blur(12px)
  /* CSS Hack FireFox */
  @supports (-moz-appearance:none)
    background linear-gradient(225deg, #292E49, #536976)
</style>