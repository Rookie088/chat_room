<template>
  <div v-show="isShow" class="modal">
    <transition name="modal-fade" enter-from-class="modal-fade-enter">
      <div v-show="isShowContent" class="content">
        <slot name="body"></slot>
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
        }, 250)
      }
    }
  }
}
</script>

<style lang="stylus" scoped>
.modal
  position fixed
  top 0
  left 0
  width 100%
  height 100%
  background rgba(0,0,0,.6)
  z-index 999
  .modal-fade-enter-active
    transition all .4s ease
  .modal-fade-leave-active
    transition all .2s ease-out
  .modal-fade-enter, .modal-fade-leave-to
    transform scale(.1)
  .content
    position absolute
    top 30%
    right 20%
    width 60%
    border-radius 8px
    overflow hidden
    background rgba(0,0,0,.2)
    backdrop-filter blur(5px)
@supports (-moz-appearance:none)
  .modal .content
    background linear-gradient(90deg, #141E30, #243B55)
@media screen and (min-width: 768px)
  .modal .content
    width 350px
    left calc(50% - 175px)
</style>