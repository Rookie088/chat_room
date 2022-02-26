<template>
  <div v-show="isShow" class="popup" @click="show(false)">
    <transition name="popup-fade" enter-from-class="popup-fade-enter">
      <div v-show="isShowContent" class="content" @click.stop>
        <slot name="content"></slot>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  data () {
    return {
      isShow: false,
      isShowContent: false
    }
  },
  methods: {
    show (isShow) {
      if (isShow) {
        document.body.style.overflow = 'hidden'
        this.isShow = true
        setTimeout(() => {
          this.isShowContent = true
        }, 50)
      } else {
        document.body.style.overflow = 'auto'
        this.isShowContent = false
        setTimeout(() => {
          this.isShow = false
        }, 450)
      }
    }
  }
}
</script>

<style lang="stylus" scoped>
.popup
  position fixed
  top 0
  left 0
  width 100%
  height 100%
  background rgba(0,0,0,.6)
  z-index 999
  .popup-fade-enter-active
    transition all .4s ease
  .popup-fade-leave-active
    transition all .4s ease-out
  .popup-fade-enter, .popup-fade-leave-to
    transform scale(3)
  .content
    position absolute
    top 0
    right 0
    width 350px
    height 100%
    background rgba(0,0,0,.2)
    backdrop-filter blur(5px)
/* CSS Hack FireFox */
@supports (-moz-appearance:none)
  .popup .content
    background linear-gradient(0deg, #bdc3c7, #2c3e50)
@media screen and (min-width: 768px)
  .popup
    .popup-fade-enter
      transform translateX(100%)
    .popup-fade-leave-to
      transform translateX(100%)
</style>