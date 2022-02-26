const PAGE_CHAT_RTC_SIGNAL_PATH = 'ws://localhost:3883'

const PAGE_CHAT_RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}

export {
  PAGE_CHAT_RTC_SIGNAL_PATH,
  PAGE_CHAT_RTC_CONFIG
}