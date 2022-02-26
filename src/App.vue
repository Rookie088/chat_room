<template>
  <Navigation />
  <div class="room">
    <!-- 左侧功能栏区 -->
    <div class="menus"></div>

    <!-- 视频及标题栏区 -->
    <div class="videos">

      <!-- 标题栏 -->
      <div class="title">
        <div class="visitor-id">
          <svg class="icon" aria-hidden="true">
            <use xlink:href="#icon-id-card"></use>
          </svg>
          <span class="nickname" v-if="userInfo.uid">{{ userInfo.nickname }}</span>
        </div>
        <div class="video-btns">
          <svg class="icon" aria-hidden="true" @click="onVideoInviteBtnClick">
            <use xlink:href="#icon-invite"></use>
          </svg>
          <svg class="icon icon-only-pc" aria-hidden="true" @click="onClearMessageBox">
            <use xlink:href="#icon-msg-clear"></use>
          </svg>
          <svg class="icon" aria-hidden="true" @click="onVideoOffBtnClick">
            <use xlink:href="#icon-power-off"></use>
          </svg>
        </div>
      </div>

      <!-- 视频或当前状态提示区 -->
      <div class="content-video-box">
        <div v-show="isOnCall" :class="['video-on', { dragarea: isVideoDrag }]" @dragover="onVideoAreaDragover" @drop="onVideoAreaDrop">
          <video autoplay muted ref="video-me"></video>
          <video
            ref="video-joiner"
            :width="dragVideoStyle.width"
            :height="dragVideoStyle.height"
            :style="{ top: `${dragVideoStyle.top}px`, left: `${dragVideoStyle.left}px` }"
            class="video-joiner"
            draggable
            autoplay
            @dragstart="onVideoDragStart"
            @dragend="onVideoDragEnd"
          ></video>
        </div>
        <div v-show="!isOnCall" class="video-off">
          <div class="tip-box">
            <img width="30%" :src="chattingTip.img" alt="permission dismissed" draggable="false">
            <p>{{ chattingTip.text }}</p>
          </div>
          <button v-if="chattingTip.isShowBtn" class="tip-btn" @click="onApplyMedia">{{ chattingTip.btnText }}</button>
        </div>
      </div>
    </div>

    <!-- 文字聊天区 -->
    <div class="chat">
      <div id="messages">
        <div v-for="msg in messages" :key="`wl-msg-${msg.id}`" :class="['item', msg.isSender ? 'self' : 'other']">
          <p class="text">{{ msg.text }}</p>
          <p class="time">{{ msg.hour }}:{{ msg.minute }}</p>
        </div>
        <div class="messages-null" v-if="!messages.length">
          <img width="60%" src="https://wenlin.work/static/imgs/luncher-error-msg-null.svg" draggable="false" alt="">
          <p>暂无消息记录</p>
        </div>
      </div>
      <div class="messager">
        <input v-model="message" :placeholder="placeholder" @keyup.enter="onSendBtnClicked" type="text" spellcheck="false" :disabled="!isOnDataChannel">
        <svg class="icon" aria-hidden="true" @click="onSendBtnClicked">
          <use xlink:href="#icon-send"></use>
        </svg>
      </div>
    </div>

    <!-- 当前在线用户区 -->
    <Popup ref="popup">
      <template #content>
        <div class="visitors" @click="onVisitorsPopupShow(false)">
          <p class="title">在线 Online</p>
          <div v-for="visitor in visitors" :key="visitor.uid" class="item" @click="onVisitorConnect(visitor.uid)">
            <p class="nickname">{{ visitor.nickname }}</p>
          </div>
        </div>
      </template>
    </Popup>

    <!-- 提示信息及交互弹窗 -->
    <Modal ref="modal">
      <template #body>
        <div class="body">
          <div class="tips">
            <img v-if="peerConnectionTip.isImg"
                 :class="{ shake: peerConnectionTip.id === 'call-in' }"
                 width="105" height="105" :src="peerConnectionTip.img"
                 alt="">
            <div v-else :class="['icon-box', { 'box-blue': peerConnectionTip.id === 'call-hangup' }]">
              <svg class="icon" aria-hidden="true">
                <use :xlink:href="peerConnectionTip.img"></use>
              </svg>
            </div>
            <p class="text">{{ peerConnectionTip.text }}</p>
          </div>
          <div v-if="peerConnectionTip.id === 'call-in'" class="call-in-footer">
            <button class="btn-reject" @click="doCallReject">拒绝</button>
            <button class="btn-resolve" @click="doCallResolve">接受</button>
          </div>
          <div v-else-if="peerConnectionTip.id === 'call-hangup'" class="call-in-footer">
            <button class="btn-hangup-cancel" @click="doCallHangupCancel">取消</button>
            <button class="btn-hangup-confirm" @click="doCallHangup">确定</button>
          </div>
          <button v-else class="call-cancel" @click="onVideoCallCancel">结束通话</button>
        </div>
      </template>
    </Modal>
  </div>
  <Footer />
</template>

<script>
import Modal from './components/Modal.vue'
import Popup from './components/Popup.vue'
import Navigation from './components/Navigation.vue'
import Footer from './components/Footer.vue'
import { polyfillGetUserMedia } from './lib/utils'
import { PAGE_CHAT_RTC_SIGNAL_PATH, PAGE_CHAT_RTC_CONFIG } from './lib/config'
import RTCManager from './lib/webrtc'

export default {
  components: {
    Modal,
    Popup,
    Navigation,
    Footer
  },
  data () {
    return {
      isOnCall: false,
      isOnDataChannel: false,
      isVideoDrag: false,

      webrtc: null,

      message: '',
      messages: [],

      placeholders: [
        '正在等待输入...',
        '输入:clear快速清除聊天记录'
      ],
      placeholderIndex: 0,

      messageTimer: null,
      visitors: [],

      chatingTipId: 'error-permission',
      chatTips: [
        { id: 'error-permission', isShowBtn: true, img: 'https://wenlin.work/static/imgs/luncher-error-permission.svg', text: '媒体权限获取失败', btnText: '获取媒体权限' },
        { id: 'success-permission', isShowBtn: false, img: 'https://wenlin.work/static/imgs/luncher-tip-invite.svg', text: '获取媒体权限成功，点击上方邀请按钮开始聊天', btnText: '' }
      ],

      peerConnectionTipId: 'reply-waiting',
      peerConnectionTips: [
        { id: 'err-permission', text: '', isImg: true, img: 'https://wenlin.work/static/imgs/img-waiting.svg' },
        { id: 'reply-waiting', text: '正在等待对方回应', isImg: true, img: 'https://wenlin.work/static/imgs/img-waiting.svg' },
        { id: 'reply-reject', text: '对方已拒绝', isImg: false, img: '#icon-close' },
        { id: 'reply-dismiss', text: '对方已断开连接', isImg: false, img: '#icon-close' },
        { id: 'call-in', text: '游客 邀请进行视频通话', isImg: true, img: 'https://wenlin.work/static/imgs/img-visitor.svg' },
        { id: 'call-cancel', text: '对方已取消通话请求', isImg: false, img: '#icon-close' },
        { id: 'call-hangup', text: '即将清除所有记录\r\n是否确认结束本次通话?', isImg: false, img: '#icon-question' }
      ],

      dragVideoStyle: {
        width: 200,
        height: 200,
        top: 0,
        left: 0
      }
    }
  },

  computed: {
    placeholder () {
      return this.placeholders[this.placeholderIndex]
    },

    chattingTip () {
      return this.chatTips.find(x => x.id === this.chatingTipId) || this.chatTips[0]
    },

    peerConnectionTip () {
      return this.peerConnectionTips.find(x => x.id === this.peerConnectionTipId) || peerConnectionTip[0]
    },

    userInfo () {
      const uid = this.webrtc?.uid
      return { uid, nickname: `游客 - ${uid?.slice(0, 6)}` }
    }
  },

  watch: {
    message: {
      handler (v) {
        if (!v) {
          this.messageTimer = setInterval(() => {
            if (++this.placeholderIndex === this.placeholders.length) {
              this.placeholderIndex = 0
            }
          }, 5000)
        } else {
          clearInterval(this.messageTimer)
        }
      },
      immediate: true
    }
  },

  mounted () {
    polyfillGetUserMedia()

    this.webrtc = new RTCManager({
      wsPath: PAGE_CHAT_RTC_SIGNAL_PATH,
      rtcConfig: PAGE_CHAT_RTC_CONFIG
    })

    this.webrtc.onCall = this.onCall

    this.webrtc.onAnswer = this.onAnswer

    this.webrtc.onUserListChange = this.onUserListChange

    this.webrtc.onRtcCreate = this.onRtcCreate

    this.webrtc.init()
  },

  methods: {
    /**
     * UI API
     */
    onSendBtnClicked () {
      if (!this.message) {
        return
      }

      if (this.message === ':clear') {
        return this.onClearMessageBox()
      }

      this.onSendMessage('message', this.message)
      this.onShowMessage({ isSender: true, text: this.message })
      this.message = ''
    },
  
    onVisitorsPopupShow (isShow = true) {
      this.$refs.popup.show(isShow)
    },

    onVideoInviteBtnClick () {
      if (!this.isOnCall) {
        this.onVisitorsPopupShow()
      }
    },

    onVideoOffBtnClick () {
      if (this.isOnCall) {
        this.peerConnectionTipId = 'call-hangup'
        this.$refs.modal.show(true)
      }
    },

    onVideoCallCancel () {
      this.doCalcelCall()
    },

    onVisitorConnect (uid) {
      if (!this.webrtc.localMedia) {
        this.onApplyMedia().then(() => {
          this.doCall(uid)
        })
      } else {
        setTimeout(() => {
          this.doCall(uid)
        }, 500)
      }
    },

    /**
     * Message Box API
     */
    onShowMessage ({ isSender, text }) {
      const time = Date.now()
      const hour = new Date(time).getHours()
      const minute = new Date(time).getMinutes()

      this.messages.push({
        id: this.messages.length,
        isSender,
        text,
        time,
        hour: hour < 10 ? '0' + hour : hour,
        minute: minute < 10 ? '0' + minute : minute
      })
      this.onMessagesToBottom()
    },

    onMessagesToBottom () {
      setTimeout(() => {
        const messages = document.getElementById('messages')

        if (messages) {
          messages.scroll({
            top: messages.scrollHeight, behavior: 'smooth'
          })
        }
      }, 50)
    },

    onClearMessageBox () {
      this.messages = []
      this.message = ''
    },

    onSendMessage (type, value) {
      this.webrtc.channel?.send(JSON.stringify({ type, value }))
    },

    /**
     * Video API
     */
    setVideoSource (id, stream) {
      this.$refs[id].srcObject = stream
    },

    onApplyMedia () {
      return new Promise((resolve, reject) => {
        const video = document.getElementsByClassName('content-video-box')?.[0]
        let width = 1190, height = 612

        if (video && getComputedStyle) {
          const style = getComputedStyle(video)
          width = parseInt(style.width)
          height = parseInt(style.height)
        }

        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } }
        })
          .then(streams => {
            this.chatingTipId = 'success-permission'
            this.webrtc.localMedia = streams
          })
          .then(() => {
            return navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: this.dragVideoStyle.width }, height: { ideal: this.dragVideoStyle.height } },
              audio: true
            })
          })
          .then(streams => {
            this.webrtc.remoteMedia = streams
            this.webrtc._addTracks()
            resolve()
          })
          .catch(err => {
            this.webrtc.localMedia = null
            this.webrtc.remoteMedia = null
            reject(err)
          })
      })
    },

    /**
     * Call API
     */

    doCall (uid) {
      this.peerConnectionTipId = 'reply-waiting'
      this.$refs.modal.show(true)
      this.webrtc.calling(uid, true)
    },

    doCalcelCall () {
      this.$refs.modal.show(false)
      this.webrtc.calling(this.webrtc.caller, false)
    },

    doCallHangup () {
      this.$refs.modal.show(false)

      this.setVideoSource('video-me', null)
      this.setVideoSource('video-joiner', null)

      this.webrtc.disconnect()

      this.isOnCall = false
    },

    doCallHangupCancel () {
      this.$refs.modal.show(false)
    },

    doCallReject () {
      this.$refs.modal.show(false)
      this.webrtc.answer(this.webrtc.caller, false)
    },

    doCallResolve () {
      if (!this.webrtc.localMedia) {
        this.onApplyMedia().then(this.doCallResolve)
      } else {
        this.$refs.modal.show(false)
        this.webrtc.answer(this.webrtc.caller, true)
      }
    },

    onCall ({ uid, state }) {
      if (state) {
        const user = this.visitors.find(u => u.uid === uid)

        this.peerConnectionTipId = 'call-in'
        this.peerConnectionTip.text = `${user.nickname} 邀请进行视频通话`
        this.$refs.modal.show(true)
      } else {
        this.peerConnectionTipId = 'call-cancel'
        this.$refs.modal.show(true)
        setTimeout(() => this.$refs.modal.show(false), 1000)
      }
      
    },

    onAnswer ({ uid, state }) {
      if (state) {
        this.$refs.modal.show(false)

        this.webrtc.channel = this.webrtc.rtc.createDataChannel('dc')

        this.webrtc.channel.onopen = () => {
          this.isOnDataChannel = true
        }

        this.webrtc.channel.onclose = () => {
          this.messages = []
          this.isOnDataChannel = false
        }

        this.webrtc.channel.onmessage = e => {
          const { type, value } = JSON.parse(e.data)

          if (type === 'message') {
            this.onShowMessage({ isSender: false, text: value })
          }
        }

        this.webrtc.connect(uid)
      } else {
        this.peerConnectionTipId = 'reply-reject'
        setTimeout(() => {
          this.$refs.modal.show(false)
        }, 1000)
      }
    },

    onUserListChange (users) {
      this.visitors = users
        .filter(u => u !== this.webrtc?.uid)
        .map(u => {
          return {
            uid: u,
            nickname: `游客 - ${u.slice(0, 6)}`,
            state: false
          }
        })
    },

    onRtcCreate (rtc) {
      rtc.ontrack = e => {
        this.setVideoSource('video-joiner', e.streams[0])
      }

      rtc.onconnectionstatechange = e => {
        if (rtc.connectionState === RTCManager.CONNECTED) {
          this.isOnCall = true
          this.setVideoSource('video-me', this.webrtc.localMedia)
        } else if (rtc.connectionState === RTCManager.DISCONNECTED) {
          if (this.isOnCall) {
            this.peerConnectionTipId = 'reply-dismiss'
            this.$refs.modal.show(true)
          }
          
          this.isOnCall = false
          this.setVideoSource('video-me', null)
          this.setVideoSource('video-joiner', null)

          this.webrtc.disconnect()
        }
      }

      rtc.ondatachannel = event => {
        this.webrtc.channel = event.channel

        this.webrtc.channel.onopen = () => {
          this.isOnDataChannel = true
        }

        this.webrtc.channel.onclose = () => {
          this.isOnDataChannel = false
          this.messages = []
        }

        this.webrtc.channel.onmessage = e => {
          const { type, value } = JSON.parse(e.data)

          if (type === 'message') {
            this.onShowMessage({ isSender: false, text: value })
          } else if (type === 'command') {
            if (value === 'hangup') {
              this.peerConnectionTipId = 'reply-dismiss'
              this.$refs.modal.show(true)
            }
          }
        }
      }
    },

    /**
     * Drag API
     */
    onVideoDragStart (e) {
      this.isVideoDrag = true
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('position', JSON.stringify({
        pageX: e.pageX,
        pageY: e.pageY
      }))
    },

    onVideoDragEnd (e) {
      this.isVideoDrag = false
    },

    onVideoAreaDragover (e) {
      e.dataTransfer.dropEffect = 'move'
      e.preventDefault()
    },

    onVideoAreaDrop (e) {
      if (e.dataTransfer.getData('position')) {
        const start = JSON.parse(e.dataTransfer.getData('position'))
        const dropArea = document.querySelector('.video-on')
        const dropAreaStyle = dropArea?.getBoundingClientRect()
        this.dragVideoStyle.top += (e.pageY - start.pageY)
        this.dragVideoStyle.left += (e.pageX - start.pageX)
        this.dragVideoStyle.top = Math.max(0, Math.min(dropAreaStyle.height - 200, this.dragVideoStyle.top))
        this.dragVideoStyle.left = Math.max(0, Math.min(dropAreaStyle.width - 200, this.dragVideoStyle.left))
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }
}
</script>

<style lang="stylus" scoped>
.room
  display flex
  min-height calc(100vh - 220px)
  padding-top 80px
  padding-bottom 120px
  margin 0 auto
  .menus
    width 80px
    background rgba(255,255,255,.04)
    margin-right 20px
  .videos
    flex 1
    display flex
    flex-direction column
    margin-top 10px
    .title
      border-bottom 1px solid rgba(255,255,255,.3)
      margin-bottom 10px
      display flex
      justify-content space-between
      align-items center
      padding 10px 0
      .visitor-id
        color rgba(255,255,255,.7)
        display flex
        flex-wrap nowrap
        white-space nowrap
        align-items center
        .icon
          fill rgba(255,255,255,.7)
          width 24px
          height 24px
        .nickname
          margin-left .8em
          letter-spacing 2px
      .video-btns
        // width 300px
        height 100%
        background rgba(255,255,255,.1)
        display flex
        justify-content space-around
        align-items center
        border-radius 8px
        padding 4px 0
        .icon
          width 24px
          height 24px
          fill rgba(255,255,255,.4)
          margin 4px 1em
          cursor pointer
          &:hover
            fill rgba(255,255,255,.9)
    .content-video-box
      flex 1
      background rgba(255,255,255,.04)
      user-select none
      .video-on
        min-height 450px
        width 100%
        height 100%
        position relative
        video
          transform rotateY(180deg)
        .video-joiner
          position absolute
          z-index 2
          cursor grab
          &:active
            cursor grabbing
      .video-off
        width 100%
        height 100%
        min-height 450px
        position relative
        display flex
        flex-direction column
        justify-content center
        align-items center
        transition ease .4s
        .tip-box
          opacity .4
          width 100%
          display flex
          flex-direction column
          justify-content center
          align-items center
          color rgba(255,255,255,.7)
        .tip-btn
          margin-top 30px
          background rgba(0,0,0,.1)
          width 200px
          height 40px
          border-radius 40px
          color #999
          transition ease linear 2s
          box-shadow 0 0 10px rgba(203,196,187,.541)
          &:hover
            border 1px solid rgba(255,255,255,.3)
      .dragarea
        box-shadow 0 0 10px rgba(255, 255, 255,.5)
  .chat
    width 350px
    margin 20px 20px 0 20px
    display flex
    flex-direction column
    #messages
      flex 1
      display flex
      flex-direction column
      align-items flex-start
      max-height calc(100vh - 320px)
      min-height 500px
      position relative
      // background rgba(0,0,0,.2)
      background rgba(255,255,255,.04)
      border-radius 20px
      padding 10px 20px
      overflow scroll
      -ms-overflow-style none
      scrollbar-width none
      &::-webkit-scrollbar
        display none
      .messages-null
        position absolute
        top 50%
        left 50%
        transform translate(-50%, -20%)
        opacity .4
        width 100%
        display flex
        flex-direction column
        justify-content center
        align-items center
        color rgba(255,255,255,.7)
      .item
        color #fff
        margin 10px 0
        width fit-content
        display flex
        flex-direction column
        max-width 80%
        .text
          background rgba(0,0,0,.3)
          border-radius 8px
          padding 5px 8px
        .time
          font-size 12px
          margin-top 4px
      .self
        align-items flex-end
        align-self flex-end
      .other
        align-items flex-start
    .messager
      background rgba(0,0,0,.3)
      padding 10px 8px
      margin-top 10px
      border-radius 30px
      border 1px solid transparent
      &:focus-within
        border 1px solid #ccc
        .icon
          fill #ccc
      input
        font-size 16px
        background transparent
        color #fff
        margin-left 10px
        padding-right 10px
        // width calc(100% - 26px)
        width calc(100% - 60px)
        &[disabled]
          cursor not-allowed
      .icon
        fill rgba(255,255,255,.3)
        width 20px
        height 20px
        vertical-align -4px
        cursor pointer
:deep(.popup) .content
  .visitors
    display flex
    flex-direction column
    justify-content flex-start
    width 100%
    height 100%
    .title
      color #fff
      font-weight bold
      font-size 1.2em
      margin 10px 20px
    .item
      padding 10px 20px
      cursor pointer
      color rgba(255,255,255,.7)
      &:hover
        background rgba(0,0,0,.2)
        color rgba(255,255,255,.9)
:deep(.modal) .content
  .body
    color rgba(255,255,255,.7)
    min-height 200px
    display flex
    flex-direction column
    justify-content space-between
    .tips
      display flex
      flex-direction column
      align-items center
      justify-content space-around
      padding 20px 0
      .icon-box
        width 85px
        height 85px
        border-radius 50%
        margin 10px
        background #fd6062
        display flex
        justify-content center
        align-items center
        .icon
          width 60%
          height 60%
      .box-blue
        background #6dd5ed
        .icon
          fill rgba(255,255,255,.8)
      .text
        white-space pre-wrap
        text-align center
      .shake
        animation shake 1s linear infinite
    .call-in-footer
      display flex
      justify-content space-around
      align-items center
      button
        width 50%
        color rgba(255,255,255,.7)
        transition all ease .2s
        padding 14px
        &:hover
          color #fff
      // .btn-hangup-confirm
      .btn-hangup-cancel
        background rgba(0,0,0,.3)
      .btn-reject
        background #fd6062
      .btn-resolve
        background #52c234
    .call-cancel
      padding 14px
      background #fd6062
      color rgba(255,255,255,.7)
      transition all ease .2s
      &:hover
        color #fff
@keyframes shake
  0%
    animation-timing-function: cubic-bezier(0.146,0.2111,0.5902,1.3204);
    transform: rotate(0)
  11%
      animation-timing-function: cubic-bezier(0.1079,0.1992,-0.6462,0.828);
      transform: rotate(7.61deg)
  23%
      animation-timing-function: cubic-bezier(0.0504,0.0951,0.0163,0.9677);
      transform: rotate(-5.789999999999999deg)
  36%
      animation-timing-function: cubic-bezier(0.0475,0.0921,0.3134,1.0455);
      transform: rotate(3.35deg)
  49%
      animation-timing-function: cubic-bezier(0.0789,0.1565,0.3413,1.0972);
      transform: rotate(-1.9300000000000002deg)
  62%
      animation-timing-function: cubic-bezier(0.141,0.2885,0.406,1.1519);
      transform: rotate(1.12deg)
  75%
      animation-timing-function: cubic-bezier(0.226,0.4698,0.5031,1.1722);
      transform: rotate(-0.64deg)
  88%
      animation-timing-function: cubic-bezier(0.3121,0.5521,0.5655,0.8997);
      transform: rotate(0.37deg)
  100%
      transform: rotate(-0.28deg)
@media screen and (max-width: 768px)
  .room
    .menus
      display none
    .chat
      display none
    .videos .title
      padding 10px 12px
      .visitor-id .nickname
        margin-left .5em
      .video-btns
        // width 100%
        .icon-only-pc
          display none
  :deep(.popup) .content
    width 100%
</style>
