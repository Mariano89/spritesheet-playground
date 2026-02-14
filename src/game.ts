import type { SpritesheetMeta, AnimationMap, Platform } from './types.ts'
import { Player } from './player.ts'
import { clamp, el } from './utils.ts'

const GROUND_Y = 400
const LEVEL_WIDTH = 3000

const PLATFORMS: Platform[] = [
  { x: -200, y: GROUND_Y, w: LEVEL_WIDTH + 400, h: 40, color: '#1e3a5f' },
  { x: 250, y: 300, w: 160, h: 16, color: '#2a4a7f' },
  { x: 500, y: 240, w: 200, h: 16, color: '#2a4a7f' },
  { x: 800, y: 300, w: 140, h: 16, color: '#2a4a7f' },
  { x: 1050, y: 220, w: 180, h: 16, color: '#2a4a7f' },
  { x: 1350, y: 320, w: 220, h: 16, color: '#2a4a7f' },
  { x: 1650, y: 260, w: 160, h: 16, color: '#2a4a7f' },
  { x: 1900, y: 200, w: 200, h: 16, color: '#2a4a7f' },
  { x: 2200, y: 300, w: 180, h: 16, color: '#2a4a7f' },
  { x: 2500, y: 240, w: 160, h: 16, color: '#2a4a7f' },
]

export class Game {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  private running = false
  private raf = 0
  private lastTime = 0
  private cameraX = 0
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
      GROUND_Y - scaledH,
    )

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
    this.resize()
  }

  private resize() {
    this.canvas.width = this.container.clientWidth
    this.canvas.height = this.container.clientHeight
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
    this.player.update(dt, PLATFORMS)

    const targetX = this.player.x - this.canvas.width / 3
    this.cameraX = clamp(
      targetX,
      0,
      Math.max(0, LEVEL_WIDTH - this.canvas.width),
    )
    this.player.x = clamp(this.player.x, 0, LEVEL_WIDTH - this.player.w)

    if (this.player.y > GROUND_Y + 200) {
      this.player.x = 100
      this.player.y = GROUND_Y - this.player.h
      this.player.vy = 0
    }

    this.hudState.textContent = this.player.state
  }

  private render() {
    const { ctx, canvas, cameraX } = this
    const w = canvas.width
    const h = canvas.height

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0f0f23')
    grad.addColorStop(1, '#1a1a3e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    for (const p of PLATFORMS) {
      const sx = p.x - cameraX
      if (sx + p.w < 0 || sx > w) continue
      ctx.fillStyle = p.color
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(sx, p.y, p.w, 3)
    }

    this.player.draw(ctx, cameraX)
  }
}
