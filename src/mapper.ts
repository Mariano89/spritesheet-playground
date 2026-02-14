import type { SpritesheetMeta, AnimationMap, AnimationName } from './types.ts'
import { Sprite } from './sprite.ts'
import { Game } from './game.ts'
import { clearCanvas, el } from './utils.ts'

const ANIM_TYPES: { name: AnimationName; required: boolean }[] = [
  { name: 'idle', required: true },
  { name: 'walk', required: false },
  { name: 'run', required: false },
  { name: 'jump', required: false },
  { name: 'crouch', required: false },
]

const THUMB_SIZE = 72
const THUMB_PAD = 4
const CELL_SIZE = THUMB_SIZE + THUMB_PAD

interface AnimInputs {
  start: HTMLInputElement
  end: HTMLInputElement
  fps: HTMLInputElement
  group: HTMLDivElement
}

let savedValues: Record<string, { start: string; end: string; fps: string }> =
  {}
let savedScale = 0.25
let activePreview: AnimationName = 'idle'
let cleanupController: AbortController | null = null

export function initMapper(image: HTMLImageElement, meta: SpritesheetMeta) {
  cleanupController?.abort()
  cleanupController = new AbortController()
  const { signal } = cleanupController

  const fieldsContainer = el<HTMLDivElement>('animation-fields')
  const gridCanvas = el<HTMLCanvasElement>('frame-grid-canvas')
  const previewCanvas = el<HTMLCanvasElement>('preview-canvas')
  const previewLabel = el<HTMLDivElement>('preview-label')
  const gameCanvas = el<HTMLCanvasElement>('game-canvas')
  const gamePlaceholder = el<HTMLDivElement>('game-placeholder')

  const previewCtx = previewCanvas.getContext('2d')!
  fieldsContainer.innerHTML = ''

  const inputs: Record<AnimationName, AnimInputs> = {} as never
  let previewSprite: Sprite | null = null
  let previewRaf = 0
  let game: Game | null = null

  for (const anim of ANIM_TYPES) {
    const group = document.createElement('div')
    group.className = 'anim-group'
    group.dataset.anim = anim.name

    group.innerHTML = `
      <div class="anim-group-header">
        <label>${anim.name}</label>
        <span class="preview-icon" title="Preview this animation">&#9654;</span>
      </div>
      <div class="anim-fields">
        <div class="field"><span>Start</span><input type="number" min="0" max="${meta.frameCount - 1}" placeholder="—"></div>
        <div class="field"><span>End</span><input type="number" min="0" max="${meta.frameCount - 1}" placeholder="—"></div>
        <div class="field"><span>FPS</span><input type="number" min="1" max="60" placeholder="${meta.fps}"></div>
      </div>`
    fieldsContainer.appendChild(group)

    const inputEls = group.querySelectorAll('input')
    inputs[anim.name] = {
      start: inputEls[0],
      end: inputEls[1],
      fps: inputEls[2],
      group,
    }

    const saved = savedValues[anim.name]
    if (saved) {
      inputs[anim.name].start.value = saved.start
      inputs[anim.name].end.value = saved.end
      inputs[anim.name].fps.value = saved.fps
    }

    group.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      activePreview = anim.name
      highlightActive()
      updatePreview()
    })
  }

  // Scale slider
  const scaleGroup = document.createElement('div')
  scaleGroup.className = 'anim-group'
  scaleGroup.innerHTML = `
    <div class="anim-group-header">
      <label>Sprite Scale</label>
      <span class="scale-value" id="scale-display">${formatScale(savedScale, meta)}</span>
    </div>
    <input type="range" id="scale-slider" min="0.05" max="1" step="0.05" value="${savedScale}" class="scale-slider">
  `
  fieldsContainer.appendChild(scaleGroup)

  const scaleSlider = el<HTMLInputElement>('scale-slider')
  const scaleDisplay = el<HTMLSpanElement>('scale-display')
  scaleSlider.addEventListener(
    'input',
    () => {
      scaleDisplay.textContent = formatScale(
        parseFloat(scaleSlider.value),
        meta,
      )
      saveState()
      syncGame()
    },
    { signal },
  )

  if (meta.animations) {
    for (const anim of ANIM_TYPES) {
      const animMeta = meta.animations[anim.name]
      if (!animMeta) continue
      const inp = inputs[anim.name]
      const saved = savedValues[anim.name]
      if (saved && (saved.start !== '' || saved.end !== '')) continue
      const startFrame = animMeta.row * meta.columns
      const endFrame = startFrame + animMeta.frames - 1
      inp.start.value = String(startFrame)
      inp.end.value = String(endFrame)
      inp.fps.value = String(animMeta.fps)
    }
    saveState()
  }

  drawFrameGrid(gridCanvas, image, meta)
  highlightActive()

  fieldsContainer.addEventListener(
    'input',
    () => {
      saveState()
      updatePreview()
      syncGame()
    },
    { signal },
  )

  updatePreview()
  syncGame()

  function highlightActive() {
    for (const anim of ANIM_TYPES) {
      inputs[anim.name].group.classList.toggle(
        'anim-group--active',
        anim.name === activePreview,
      )
    }
  }

  function saveState() {
    for (const anim of ANIM_TYPES) {
      savedValues[anim.name] = {
        start: inputs[anim.name].start.value,
        end: inputs[anim.name].end.value,
        fps: inputs[anim.name].fps.value,
      }
    }
    savedScale = parseFloat(scaleSlider.value)
  }

  function getAnimations(): AnimationMap {
    const anims: AnimationMap = {}
    for (const anim of ANIM_TYPES) {
      const s = inputs[anim.name].start.value
      const e = inputs[anim.name].end.value
      if (s === '' || e === '') continue
      const fpsVal = inputs[anim.name].fps.value
      anims[anim.name] = {
        startFrame: parseInt(s, 10),
        endFrame: parseInt(e, 10),
        fps: fpsVal ? parseInt(fpsVal, 10) : meta.fps,
      }
    }
    return anims
  }

  function hasIdle(): boolean {
    return inputs.idle.start.value !== '' && inputs.idle.end.value !== ''
  }

  function syncGame() {
    const anims = getAnimations()
    const scale = parseFloat(scaleSlider.value)

    if (!hasIdle()) {
      if (game) {
        game.stop()
        game = null
      }
      gamePlaceholder.style.display = ''
      return
    }

    gamePlaceholder.style.display = 'none'

    if (!game) {
      game = new Game(gameCanvas, image, meta, anims, scale)
      game.start()
    } else {
      game.updateAnimations(anims, scale)
    }
  }

  function updatePreview() {
    const anims = getAnimations()
    const target = anims[activePreview]
      ? activePreview
      : (Object.keys(anims)[0] as AnimationName | undefined)

    if (!target) {
      stopPreview()
      previewLabel.textContent = 'Select an animation'
      return
    }

    previewLabel.textContent = `Playing: ${target}`
    previewSprite = new Sprite(image, meta, anims)
    previewSprite.setAnimation(target)
    if (!previewRaf) startPreviewLoop()
  }

  function startPreviewLoop() {
    let last = performance.now()
    function loop(now: number) {
      const dt = (now - last) / 1000
      last = now

      if (previewSprite) {
        previewSprite.update(dt)
        clearCanvas(previewCtx)

        const scale = Math.min(
          previewCanvas.width / meta.frameWidth,
          previewCanvas.height / meta.frameHeight,
        )
        const dx = (previewCanvas.width - meta.frameWidth * scale) / 2
        const dy = (previewCanvas.height - meta.frameHeight * scale) / 2
        previewSprite.draw(previewCtx, dx, dy, scale)
      }

      previewRaf = requestAnimationFrame(loop)
    }
    previewRaf = requestAnimationFrame(loop)
  }

  function stopPreview() {
    if (previewRaf) {
      cancelAnimationFrame(previewRaf)
      previewRaf = 0
    }
    previewSprite = null
    clearCanvas(previewCtx)
  }

  gridCanvas.addEventListener(
    'click',
    (e) => {
      const rect = gridCanvas.getBoundingClientRect()
      const scaleX = gridCanvas.width / rect.width
      const scaleY = gridCanvas.height / rect.height
      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      let frameIndex: number

      if (meta.animations) {
        const animEntries = Object.entries(meta.animations)
        const rowHeight = CELL_SIZE + LABEL_HEIGHT
        const animRow = Math.floor(y / rowHeight)
        if (animRow < 0 || animRow >= animEntries.length) return
        const [, anim] = animEntries[animRow]
        const yInRow = y - animRow * rowHeight
        if (yInRow < LABEL_HEIGHT) return
        const col = Math.floor(x / CELL_SIZE)
        if (col < 0 || col >= anim.frames) return
        frameIndex = anim.row * meta.columns + col
      } else {
        const cols = Math.min(meta.columns, 10)
        const col = Math.floor(x / CELL_SIZE)
        const row = Math.floor(y / CELL_SIZE)
        frameIndex = row * cols + col
        if (frameIndex < 0 || frameIndex >= meta.frameCount) return
      }

      for (const anim of ANIM_TYPES) {
        const inp = inputs[anim.name]
        if (inp.start.value === '') {
          inp.start.value = String(frameIndex)
          inp.start.dispatchEvent(new Event('input', { bubbles: true }))
          return
        }
        if (inp.end.value === '') {
          inp.end.value = String(frameIndex)
          inp.end.dispatchEvent(new Event('input', { bubbles: true }))
          return
        }
      }
    },
    { signal },
  )

  return {
    stopPreview,
    stopGame() {
      game?.stop()
      game = null
    },
  }
}

function formatScale(scale: number, meta: SpritesheetMeta): string {
  const w = Math.round(meta.frameWidth * scale)
  const h = Math.round(meta.frameHeight * scale)
  return `${scale.toFixed(2)}x (${w}×${h}px)`
}

function drawFrameGrid(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  meta: SpritesheetMeta,
) {
  if (meta.animations) {
    drawFrameGridV2(canvas, image, meta)
    return
  }

  const cols = Math.min(meta.columns, 10)
  const rows = Math.ceil(meta.frameCount / cols)

  canvas.width = cols * CELL_SIZE
  canvas.height = rows * CELL_SIZE

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#16213e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < meta.frameCount; i++) {
    const gCol = i % cols
    const gRow = Math.floor(i / cols)
    const dx = gCol * CELL_SIZE + THUMB_PAD / 2
    const dy = gRow * CELL_SIZE + THUMB_PAD / 2

    const srcCol = i % meta.columns
    const srcRow = Math.floor(i / meta.columns)
    const sx = srcCol * meta.frameWidth
    const sy = srcRow * meta.frameHeight

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(dx, dy, THUMB_SIZE, THUMB_SIZE)

    const scale = Math.min(
      THUMB_SIZE / meta.frameWidth,
      THUMB_SIZE / meta.frameHeight,
    )
    const fw = meta.frameWidth * scale
    const fh = meta.frameHeight * scale

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      image,
      sx,
      sy,
      meta.frameWidth,
      meta.frameHeight,
      dx + (THUMB_SIZE - fw) / 2,
      dy + (THUMB_SIZE - fh) / 2,
      fw,
      fh,
    )

    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = 'bold 11px monospace'
    ctx.fillText(String(i), dx + 3, dy + 13)
  }
}

const LABEL_HEIGHT = 18

function drawFrameGridV2(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  meta: SpritesheetMeta,
) {
  const anims = meta.animations!
  const animEntries = Object.entries(anims)
  const cols = Math.min(meta.columns, 10)
  const rowHeight = CELL_SIZE + LABEL_HEIGHT

  canvas.width = cols * CELL_SIZE
  canvas.height = animEntries.length * rowHeight

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#16213e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let r = 0; r < animEntries.length; r++) {
    const [name, anim] = animEntries[r]
    const yOffset = r * rowHeight

    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = 'bold 11px monospace'
    ctx.fillText(name, 4, yOffset + 13)

    for (let f = 0; f < anim.frames; f++) {
      const dx = f * CELL_SIZE + THUMB_PAD / 2
      const dy = yOffset + LABEL_HEIGHT + THUMB_PAD / 2

      const sx = f * meta.frameWidth
      const sy = anim.row * meta.frameHeight

      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(dx, dy, THUMB_SIZE, THUMB_SIZE)

      const scale = Math.min(
        THUMB_SIZE / meta.frameWidth,
        THUMB_SIZE / meta.frameHeight,
      )
      const fw = meta.frameWidth * scale
      const fh = meta.frameHeight * scale

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        image,
        sx,
        sy,
        meta.frameWidth,
        meta.frameHeight,
        dx + (THUMB_SIZE - fw) / 2,
        dy + (THUMB_SIZE - fh) / 2,
        fw,
        fh,
      )

      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = 'bold 11px monospace'
      ctx.fillText(String(f), dx + 3, dy + 13)
    }
  }
}
