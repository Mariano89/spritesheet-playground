import './styles/main.scss'
import { initLoader } from './loader.ts'
import { initMapper } from './mapper.ts'
import { el } from './utils.ts'

const screens = {
  landing: el('screen-landing'),
  mapper: el('screen-mapper'),
}

let mapperCleanup: ReturnType<typeof initMapper> | null = null

function showScreen(name: keyof typeof screens) {
  for (const [key, screen] of Object.entries(screens)) {
    screen.classList.toggle('active', key === name)
  }
}

initLoader((image, meta) => {
  showScreen('mapper')
  mapperCleanup = initMapper(image, meta)
})

el('btn-back-landing').addEventListener('click', () => {
  mapperCleanup?.stopPreview()
  mapperCleanup?.stopGame()
  showScreen('landing')
})
