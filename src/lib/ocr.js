// On-device OCR with Tesseract.js (free, no API key; the image never leaves the phone).
// The engine + English model (~a few MB) download from a CDN on first use and are cached.

let workerPromise = null
let progressCb = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: (m) => progressCb?.(m),
      })
      // Sparse-text mode reliably picks up the large "₹38" heading.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
      return worker
    })()
    workerPromise.catch(() => { workerPromise = null })
  }
  return workerPromise
}

/** Grayscale, invert dark-mode screenshots to dark-on-light, upscale small images. */
async function preprocess(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.max(1, Math.min(3, 1080 / bmp.width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close?.()

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    d[i] = d[i + 1] = d[i + 2] = g
    sum += g
  }
  if (sum / (d.length / 4) < 128) {
    for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i]
  }
  ctx.putImageData(img, 0, 0)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

export async function recognizeScreenshot(file, onProgress) {
  const image = await preprocess(file)
  progressCb = onProgress
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
    const words = (data.blocks || []).flatMap((b) =>
      b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words))
    )
    return { text: data.text || '', words }
  } finally {
    progressCb = null
  }
}
