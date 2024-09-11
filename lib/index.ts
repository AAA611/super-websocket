import EventEmitter from 'events'

interface Options {
  checkInterval?: number
  serverTimeout?: number
  reconnect?: Function
  pingText?: string
  pongText?: string
}

class WsHeartbeat extends EventEmitter {
  private ws: WebSocket
  private pingText: string
  private pongText: string
  private checkInterval: number
  private serverTimeout: number
  private heartbeatTimer: number | undefined
  private heartbeatTimeoutTimer: number | undefined
  private reconnect: Function
  private stoped: boolean
  private options: Options
  constructor(ws, options = {} as Options) {
    super()
    this.ws = ws
    this.stoped = false
    this.options = options
    this.pingText = options.pingText || 'ping'
    this.pongText = options.pongText || 'pong'
    this.checkInterval = options.checkInterval || 3000
    this.serverTimeout = options.serverTimeout || 3000
    this.heartbeatTimer = undefined
    this.heartbeatTimeoutTimer = undefined
    this.reconnect = options.reconnect || (() => { })
    this.init()
  }

  private init() {
    this.ws.addEventListener('open', () => {
      this.emit('open')
      this.heartbeat()
    })

    this.ws.addEventListener('message', (e) => {
      const message = e.data
      if (message === this.pongText) {
        this.emit('pong')
        this.resetHeartbeat()
        if (!this.stoped) this.heartbeat()
      } else {
        this.emit('message')
      }
    })

    this.ws.addEventListener('error', () => {
      this.emit('error')
      this.reconnect()
    })

    this.ws.addEventListener('close', () => {
      this.emit('close')
      this.resetHeartbeat()
    })
  }

  private heartbeat() {
    this.heartbeatTimer = setTimeout(() => {
      this.ws.send(this.pingText)
      this.startHeartbeatTimeout()
    }, this.checkInterval) as any as number
  }

  private startHeartbeatTimeout() {
    this.heartbeatTimeoutTimer = setTimeout(() => {
      if (this.serverTimeout > 30000) {
        this.reconnect()
      } else {
        this.serverTimeout += 1000
        this.heartbeat()
      }
    }, this.serverTimeout) as any as number
  }

  private resetHeartbeat() {
    clearTimeout(this.heartbeatTimer)
    clearTimeout(this.heartbeatTimeoutTimer)
  }

  private resetAll() {
    this.resetHeartbeat()
    // todo:refactor
    this.serverTimeout = this.options.serverTimeout || 3000
  }

  public resetWs(ws: WebSocket) {
    this.ws = ws
    this.resetAll()
  }

  public startHeartbeat() {
    this.stoped = false
    this.heartbeat()
  }

  public stopHeartbeat() {
    this.stoped = true
    this.resetHeartbeat()
  }
}

export default WsHeartbeat