import type { SpritesheetMeta, AnimationMap, Platform } from './types.ts'
import { Sprite } from './sprite.ts'

const GRAVITY = 980
const WALK_SPEED = 200
const RUN_SPEED = 360
const JUMP_VEL = -420

interface Keys {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  shift: boolean
}

export class Player {
  sprite: Sprite
  x: number
  y: number
  w: number
  h: number
  vx = 0
  vy = 0
  onGround = false
  state = 'idle'
  scale: number

  private animations: AnimationMap
  private keys: Keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    shift: false,
  }
  private onKeyDown: (e: KeyboardEvent) => void
  private onKeyUp: (e: KeyboardEvent) => void

  constructor(
    image: HTMLImageElement,
    meta: SpritesheetMeta,
    animations: AnimationMap,
    scale: number,
    x: number,
    y: number,
  ) {
    this.animations = animations
    this.scale = scale
    this.sprite = new Sprite(image, meta, animations)
    this.x = x
    this.y = y
    this.w = Math.round(meta.frameWidth * scale)
    this.h = Math.round(meta.frameHeight * scale)

    this.onKeyDown = (e) => this.handleKey(e, true)
    this.onKeyUp = (e) => this.handleKey(e, false)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
  }

  private handleKey(e: KeyboardEvent, down: boolean) {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = down
        break
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = down
        break
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        this.keys.up = down
        break
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = down
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = down
        break
      default:
        return
    }
    e.preventDefault()
  }

  update(dt: number, platforms: Platform[]) {
    const speed = this.keys.shift ? RUN_SPEED : WALK_SPEED

    if (this.keys.left) {
      this.vx = -speed
      this.sprite.flipX = true
    } else if (this.keys.right) {
      this.vx = speed
      this.sprite.flipX = false
    } else {
      this.vx = 0
    }

    if (this.keys.up && this.onGround) {
      this.vy = JUMP_VEL
      this.onGround = false
    }

    this.vy += GRAVITY * dt

    this.x += this.vx * dt
    this.resolveX(platforms)

    this.y += this.vy * dt
    this.onGround = false
    this.resolveY(platforms)

    this.updateState()
    this.sprite.update(dt)
  }

  private overlaps(p: Platform) {
    return (
      this.x < p.x + p.w &&
      this.x + this.w > p.x &&
      this.y < p.y + p.h &&
      this.y + this.h > p.y
    )
  }

  private resolveX(platforms: Platform[]) {
    for (const p of platforms) {
      if (!this.overlaps(p)) continue
      if (this.vx > 0) this.x = p.x - this.w
      else if (this.vx < 0) this.x = p.x + p.w
      this.vx = 0
    }
  }

  private resolveY(platforms: Platform[]) {
    for (const p of platforms) {
      if (!this.overlaps(p)) continue
      if (this.vy > 0) {
        this.y = p.y - this.h
        this.vy = 0
        this.onGround = true
      } else if (this.vy < 0) {
        this.y = p.y + p.h
        this.vy = 0
      }
    }
  }

  private updateState() {
    let next: string

    if (!this.onGround) {
      next = 'jump'
    } else if (this.keys.down) {
      next = 'crouch'
    } else if (this.vx !== 0) {
      next = this.keys.shift ? 'run' : 'walk'
    } else {
      next = 'idle'
    }

    if (!this.animations[next as keyof AnimationMap]) next = 'idle'

    if (next !== this.state) {
      this.state = next
      this.sprite.setAnimation(next)
    }
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number) {
    this.sprite.draw(ctx, this.x - cameraX, this.y, this.scale)
  }
}
