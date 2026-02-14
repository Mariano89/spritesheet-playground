import type { SpritesheetMeta, AnimationMap } from './types.ts'

export class Sprite {
  private image: HTMLImageElement
  private meta: SpritesheetMeta
  private animations: AnimationMap
  private currentAnim: string = 'idle'
  private frameIndex = 0
  private elapsed = 0
  flipX = false

  constructor(
    image: HTMLImageElement,
    meta: SpritesheetMeta,
    animations: AnimationMap,
  ) {
    this.image = image
    this.meta = meta
    this.animations = animations
  }

  private getFrameRect(index: number) {
    const col = index % this.meta.columns
    const row = Math.floor(index / this.meta.columns)
    return {
      sx: col * this.meta.frameWidth,
      sy: row * this.meta.frameHeight,
      sw: this.meta.frameWidth,
      sh: this.meta.frameHeight,
    }
  }

  private getAnim() {
    return (
      this.animations[this.currentAnim as keyof AnimationMap] ??
      this.animations.idle
    )
  }

  setAnimation(name: string) {
    const resolved = this.animations[name as keyof AnimationMap] ? name : 'idle'
    if (this.currentAnim === resolved) return
    this.currentAnim = resolved
    this.frameIndex = 0
    this.elapsed = 0
  }

  update(dt: number) {
    const anim = this.getAnim()
    if (!anim) return

    const fps = anim.fps || this.meta.fps
    this.elapsed += dt

    if (this.elapsed >= 1 / fps) {
      this.elapsed -= 1 / fps
      const totalFrames = anim.endFrame - anim.startFrame + 1
      this.frameIndex = (this.frameIndex + 1) % totalFrames
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
    const anim = this.getAnim()
    if (!anim) return

    const { sx, sy, sw, sh } = this.getFrameRect(
      anim.startFrame + this.frameIndex,
    )
    const dw = sw * scale
    const dh = sh * scale

    ctx.save()
    if (this.flipX) {
      ctx.translate(x + dw, y)
      ctx.scale(-1, 1)
      ctx.drawImage(this.image, sx, sy, sw, sh, 0, 0, dw, dh)
    } else {
      ctx.drawImage(this.image, sx, sy, sw, sh, x, y, dw, dh)
    }
    ctx.restore()
  }
}
