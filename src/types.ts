export interface SpriteAnimationMeta {
  row: number
  frames: number
  fps: number
}

export interface SpritesheetMeta {
  frameWidth: number
  frameHeight: number
  frameCount: number
  columns: number
  rows: number
  fps: number
  animations?: Record<string, SpriteAnimationMeta>
}

export interface AnimationDef {
  startFrame: number
  endFrame: number
  fps: number
}

export type AnimationMap = Partial<Record<AnimationName, AnimationDef>>

export type AnimationName = 'idle' | 'walk' | 'run' | 'jump' | 'crouch'

export interface Platform {
  x: number
  y: number
  w: number
  h: number
  color: string
}
