const SIGNAL_ID = 'signal-id'
const SIGNAL_USERS = 'signal-users'

const SIGNAL_CALL = 'signal-call'
const SIGNAL_ANSWER = 'signal-answer'

const SIGNAL_RTC_DESCRIPTION = 'signal-rtc-description'
const SIGNAL_RTC_ANSWER = 'signal-rtc-answer'
const SIGNAL_RTC_ICECANDIDATE = 'signal-rtc-icecandidate' 


class RTCManager { 
  constructor ({ wsPath, rtcConfig }) {
    this.ws = null
    this.rtc = null
    this.channel = null

    this.localMedia = null
    this.remoteMedia = null

    this.caller = null
    this.uid = null

    this.signalServerPath = wsPath
    this.rtcConfig = rtcConfig

    this.onCall = null
    this.onAnswer = null
    this.onUserListChange = null
    this.onRtcCreate = null

    this._initWs()
  }

  static get CONNECTED () {
    return 'connected'
  }

  static get DISCONNECTED () {
    return 'disconnected'
  }

  set userList (users) {
    this.onUserListChange?.(users)
  }

  init () {
    this.rtc = new RTCPeerConnection(this.rtcConfig)

    this.rtc.onicecandidate = e => {
      this._wsSend({ event: SIGNAL_RTC_ICECANDIDATE, data: { uid: this.caller, candidate: e.candidate } })
    }

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const { event, data } = msg

      switch (event) {
        case SIGNAL_ID:
          this._onId(data)
          break

        case SIGNAL_USERS:
          this.userList = data.users
          break

        case SIGNAL_CALL:
          this.caller = data.state ? data.uid : null
          this.onCall?.(data)
          break

        case SIGNAL_ANSWER:
          this.caller = data.state ? data.uid : null
          this.onAnswer?.(data)
          break

        case SIGNAL_RTC_DESCRIPTION:
          this._onRtcDescription(data)
          break

        case SIGNAL_RTC_ANSWER:
          this._onRtcAnswer(data)
          break

        case SIGNAL_RTC_ICECANDIDATE:
          this._onRtcIcecandidate(data)
          break

        default:
          break
      }
    }

    this.onRtcCreate(this.rtc)

    return this
  }

  calling (uid, state) {
    this.caller = state ? uid : null

    this._wsSend({
      event: SIGNAL_CALL,
      data: { uid, state }
    })
  }

  answer (uid, state) {
    this.caller = state ? uid : null

    this._wsSend({
      event: SIGNAL_ANSWER,
      data: { uid, state }
    })
  }

  connect (uid) {      
    this.rtc.createOffer()
      .then(offer => this.rtc.setLocalDescription(offer))
      .then(() => {
        this._wsSend({
          event: SIGNAL_RTC_DESCRIPTION,
          data: { uid, description: this.rtc.localDescription }
        })
      })
  }

  disconnect () {
    this.channel?.close()
    this.rtc?.close()

    this.rtc = null
    this.channel = null
    this.caller = null
    this.localMedia = null
    this.remoteMedia = null

    this.init()
  }

  _initWs () {
    this.ws = new WebSocket(this.signalServerPath)

    this.ws.onopen = () => {
    }

    this.ws.onerror = () => {
      this.ws = null
    }
  }

  _wsSend (data) {
    this.ws?.send(JSON.stringify(data))
  }

  _onId ({ uid }) {
    this.uid = uid
  }

  _onRtcDescription ({ uid, description }) {
    this.rtc.setRemoteDescription(description)
      .then(() => this.rtc.createAnswer())
      .then(answer => this.rtc.setLocalDescription(answer))
      .then(() => this._wsSend({
        event: SIGNAL_RTC_ANSWER,
        data: { uid, answer: this.rtc.localDescription }
      }))
  }

  _onRtcAnswer ({ uid, answer }) {
    this.rtc.setRemoteDescription(answer)
  }

  _onRtcIcecandidate ({ candidate }) {
    if (candidate) {  
      this.rtc.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(err => console.log(err))
    }
  }

  _addTracks () {
    this.remoteMedia.getTracks().forEach(stream => {
      this.rtc.addTrack(stream, this.remoteMedia)
    })
  }
}

export default RTCManager