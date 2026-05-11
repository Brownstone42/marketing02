import express from 'express'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const app = express()
const PORT = 3000

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// POST /api/generate
// Body: { prompt: string, model?: string, options?: { aspect_ratio?, resolution?, duration? } }
app.post('/api/generate', async (req, res) => {
  const { prompt, model = 'nano_banana_2', options = {} } = req.body

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const args = ['generate', 'create', model, '--prompt', prompt, '--wait']

  if (options.aspect_ratio) args.push('--aspect_ratio', options.aspect_ratio)
  if (options.resolution) args.push('--resolution', options.resolution)
  if (options.duration != null) args.push('--duration', String(options.duration))

  try {
    const { stdout } = await execFileAsync('hf', args, { timeout: 180_000 })
    const text = stdout.trim()
    try {
      res.json({ result: JSON.parse(text) })
    } catch {
      res.json({ result: text })
    }
  } catch (err) {
    const status = err.code === 'ETIMEDOUT' ? 504 : 500
    res.status(status).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
