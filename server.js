import express from 'express'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, unlink } from 'fs/promises'
import { extname, resolve } from 'path'
import { tmpdir } from 'os'
import multer from 'multer'

const HISTORY_FILE = resolve('./history.json')

async function readHistory() {
  try {
    return JSON.parse(await readFile(HISTORY_FILE, 'utf8'))
  } catch {
    return []
  }
}

async function appendHistory(entry) {
  const history = await readHistory()
  history.unshift({ rating: 0, note: '', ...entry })
  await writeFile(HISTORY_FILE, JSON.stringify(history.slice(0, 200), null, 2))
}

const execFileAsync = promisify(execFile)

const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (req, file, cb) => cb(null, `ref-${Date.now()}${extname(file.originalname)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

const app = express()
const PORT = 3000

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/history', async (req, res) => {
  res.json(await readHistory())
})

app.delete('/api/history/:id', async (req, res) => {
  const id = Number(req.params.id)
  const history = await readHistory()
  const next = history.filter((e) => e.id !== id)
  if (next.length === history.length) return res.status(404).json({ error: 'not found' })
  await writeFile(HISTORY_FILE, JSON.stringify(next, null, 2))
  res.json({ ok: true })
})

app.patch('/api/history/:id', express.json(), async (req, res) => {
  const id = Number(req.params.id)
  const { rating, note } = req.body
  const history = await readHistory()
  const entry = history.find((e) => e.id === id)
  if (!entry) return res.status(404).json({ error: 'not found' })
  if (rating !== undefined) entry.rating = rating
  if (note !== undefined) entry.note = note
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2))
  res.json(entry)
})

// GET /api/studio/avatars — list available avatars
app.get('/api/studio/avatars', async (req, res) => {
  try {
    const { stdout } = await execFileAsync('hf', ['marketing-studio', 'avatars', 'list', '--json'])
    res.json(JSON.parse(stdout.trim()))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/marketing-studio — multipart/form-data
// Fields: prompt, mode, aspect_ratio, duration, avatar_id, avatar_type
// Files:  product_image (required)
app.post('/api/marketing-studio', upload.single('product_image'), async (req, res) => {
  const { prompt, mode = 'ugc', aspect_ratio = '16:9', duration = '10', avatar_id, avatar_type = 'preset' } = req.body
  const productFile = req.file

  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt is required' })
  if (!productFile) return res.status(400).json({ error: 'product image is required' })
  if (!avatar_id) return res.status(400).json({ error: 'avatar is required' })

  try {
    // 1. Upload product image → pass as --image reference
    const { stdout: uploadOut } = await execFileAsync('hf', ['upload', 'create', productFile.path, '--json'])
    const uploadData = JSON.parse(uploadOut.trim())

    // 2. Generate video
    const { stdout } = await execFileAsync('hf', [
      'generate', 'create', 'marketing_studio_video',
      '--prompt', prompt.trim(),
      '--mode', mode,
      '--aspect_ratio', aspect_ratio,
      '--duration', String(duration),
      '--image', uploadData.id,
      '--avatars', JSON.stringify([{ id: avatar_id, type: avatar_type }]),
      '--wait', '--json',
    ], { timeout: 300_000 })

    const text = stdout.trim()
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = text }
    const result = parsed
    const entry = result?.[0] ?? result
    if (entry?.result_url) {
      await appendHistory({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt: prompt.trim(),
        model: 'marketing_studio_video',
        aspect_ratio,
        result_url: entry.result_url,
      }).catch(() => {})
    }
    res.json({ result })
  } catch (err) {
    res.status(500).json({ error: err.stderr || err.message })
  } finally {
    if (productFile) await unlink(productFile.path).catch(() => {})
  }
})

// POST /api/generate — multipart/form-data
// Fields: prompt (required), model, aspect_ratio, resolution, duration
// File:   image (optional reference image)
app.post('/api/generate', upload.single('image'), async (req, res) => {
  const { prompt, model = 'nano_banana_2', aspect_ratio, resolution, duration } = req.body

  if (!prompt?.trim()) {
    if (req.file) await unlink(req.file.path).catch(() => {})
    return res.status(400).json({ error: 'prompt is required' })
  }

  const args = ['generate', 'create', model, '--prompt', prompt.trim(), '--wait', '--json']

  if (aspect_ratio) args.push('--aspect_ratio', aspect_ratio)
  if (resolution) args.push('--resolution', resolution)
  if (duration) args.push('--duration', String(duration))
  if (req.file) args.push('--image', req.file.path)

  try {
    const { stdout } = await execFileAsync('hf', args, { timeout: 180_000 })
    const text = stdout.trim()
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = text }
    const result = parsed
    const entry = result?.[0] ?? result
    if (entry?.result_url) {
      await appendHistory({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt: prompt.trim(),
        model,
        aspect_ratio,
        result_url: entry.result_url,
      }).catch((e) => console.error('History write error:', e))
    } else {
      console.log('No result_url found in entry:', JSON.stringify(entry).slice(0, 200))
    }
    res.json({ result })
  } catch (err) {
    const status = err.code === 'ETIMEDOUT' ? 504 : 500
    res.status(status).json({ error: err.message })
  } finally {
    if (req.file) await unlink(req.file.path).catch(() => {})
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
