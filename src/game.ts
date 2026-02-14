import type { SpritesheetMeta, AnimationMap, Platform } from './types.ts'
import { Player } from './player.ts'
import { clamp, el } from './utils.ts'

const GROUND_Y = 400

export class Game {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  private running = false
  private raf = 0
  private lastTime = 0
  private player: Player
  private image: HTMLImageElement
  private meta: SpritesheetMeta
  private hudState: HTMLElement
  private resizeObserver: ResizeObserver

  constructor(
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    meta: SpritesheetMeta,
    animations: AnimationMap,
    scale: number,
  ) {
    this.canvas = canvas
    this.container = canvas.parentElement!
    this.ctx = canvas.getContext('2d')!
    this.image = image
    this.meta = meta
    this.hudState = el('hud-state')

    const scaledH = Math.round(meta.frameHeight * scale)
    this.player = new Player(
      image,
      meta,
      animations,
      scale,
      100,
      -scaledH,
    )

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
    this.resize()
  }

  private resize() {
    this.canvas.width = this.container.clientWidth
    this.canvas.height = GROUND_Y + 40
  }

  updateAnimations(animations: AnimationMap, scale: number) {
    const oldX = this.player.x
    const scaledH = Math.round(this.meta.frameHeight * scale)
    this.player.destroy()
    this.player = new Player(
      this.image,
      this.meta,
      animations,
      scale,
      oldX,
      GROUND_Y - scaledH,
    )
  }

  start() {
    this.running = true
    this.lastTime = performance.now()
    this.raf = requestAnimationFrame((t) => this.loop(t))
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    this.player.destroy()
    this.resizeObserver.disconnect()
  }

  private loop(now: number) {
    if (!this.running) return
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    this.update(dt)
    this.render()

    this.raf = requestAnimationFrame((t) => this.loop(t))
  }

  private update(dt: number) {
    const ground: Platform[] = [
      { x: 0, y: GROUND_Y, w: this.canvas.width, h: 40, color: '#1e3a5f' },
    ]
    this.player.update(dt, ground)
    this.player.x = clamp(this.player.x, 0, this.canvas.width - this.player.w)

    if (this.player.y > GROUND_Y + 200) {
      this.player.x = 100
      this.player.y = -this.player.h
      this.player.vy = 0
    }

    this.hudState.textContent = this.player.state
  }

  private render() {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0f0f23')
    grad.addColorStop(1, '#1a1a3e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Ground
    ctx.fillStyle = '#1e3a5f'
    ctx.fillRect(0, GROUND_Y, w, 40)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(0, GROUND_Y, w, 3)

    this.player.draw(ctx, 0)
  }
}
