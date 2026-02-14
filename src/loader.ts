import type { SpritesheetMeta } from './types.ts'
import { el } from './utils.ts'

const REQUIRED_FIELDS: (keyof SpritesheetMeta)[] = [
  'frameWidth',
  'frameHeight',
  'frameCount',
  'columns',
  'rows',
  'fps',
]

export function initLoader(
  onLoaded: (image: HTMLImageElement, meta: SpritesheetMeta) => void,
) {
  const dropZone = el<HTMLDivElement>('drop-zone')
  const fileInput = el<HTMLInputElement>('file-input')
  const status = el<HTMLDivElement>('load-status')

  let pendingPng: File | null = null
  let pendingJson: File | null = null

  function setStatus(msg: string, type: '' | 'error' | 'success' = '') {
    status.textContent = msg
    status.className = `load-status ${type}`
  }

  function handleFiles(files: FileList) {
    for (const file of files) {
      if (file.name.endsWith('.png')) pendingPng = file
      else if (file.name.endsWith('.json')) pendingJson = file
    }

    if (pendingPng && pendingJson) {
      processFiles()
    } else if (pendingPng) {
      setStatus('PNG loaded. Now add the JSON metadata file.', 'success')
    } else if (pendingJson) {
      setStatus('JSON loaded. Now add the PNG spritesheet file.', 'success')
    }
  }

  async function processFiles() {
    setStatus('Processing...')
    try {
      const meta = await readJson(pendingJson!)
      validateMeta(meta)
      const image = await loadImage(pendingPng!)
      setStatus('Spritesheet loaded!', 'success')
      onLoaded(image, meta as unknown as SpritesheetMeta)
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`, 'error')
    }
  }

  function readJson(file: File): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result as string))
        } catch {
          reject(new Error('Invalid JSON file.'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read JSON file.'))
      reader.readAsText(file)
    })
  }

  function validateMeta(meta: Record<string, unknown>) {
    for (const field of REQUIRED_FIELDS) {
      if (meta[field] === undefined)
        throw new Error(`Missing "${field}" in JSON metadata.`)
    }
  }

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load PNG.'))
      }
      img.src = url
    })
  }

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragover')
  })
  dropZone.addEventListener('dragleave', () =>
    dropZone.classList.remove('dragover'),
  )
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files)
  })

  fileInput.addEventListener('change', () => {
    if (fileInput.files) handleFiles(fileInput.files)
    fileInput.value = ''
  })

  dropZone.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.file-btn')) return
    fileInput.click()
  })
}
