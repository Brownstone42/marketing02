<script setup>
import { ref, computed, onMounted } from 'vue'

const prompt = ref('')
const model = ref('nano_banana_2')
const aspectRatio = ref('1:1')
const loading = ref(false)
const result = ref(null)
const error = ref(null)
const referenceFile = ref(null)
const referencePreview = ref(null)
const isDragOver = ref(false)
const fileInput = ref(null)
const history = ref([])

const IMAGE_MODELS = ['nano_banana_2', 'nano_banana_pro']
const isImageModel = computed(() => IMAGE_MODELS.includes(model.value))
const improving = ref(false)
const improveError = ref(null)

async function improvePrompt() {
  if (!prompt.value.trim() || improving.value) return
  improving.value = true
  improveError.value = null
  try {
    const res = await fetch('/api/improve-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.value.trim(), model: model.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to improve prompt')
    prompt.value = data.improved
  } catch (e) {
    improveError.value = e.message
  } finally {
    improving.value = false
  }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/history')
    if (res.ok) history.value = await res.json()
  } catch {}
}

function loadFromHistory(entry) {
  result.value = { result_url: entry.result_url }
}

onMounted(loadHistory)

function setReferenceFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  referenceFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => (referencePreview.value = e.target.result)
  reader.readAsDataURL(file)
}

function clearReference() {
  referenceFile.value = null
  referencePreview.value = null
  if (fileInput.value) fileInput.value.value = ''
}

function handleDrop(e) {
  isDragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file) setReferenceFile(file)
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) setReferenceFile(file)
}

async function generate() {
  if (!prompt.value.trim() || loading.value) return
  loading.value = true
  result.value = null
  error.value = null

  try {
    const fd = new FormData()
    fd.append('prompt', prompt.value.trim())
    fd.append('model', model.value)
    if (isImageModel.value) fd.append('aspect_ratio', aspectRatio.value)
    if (referenceFile.value) fd.append('image', referenceFile.value)

    const res = await fetch('/api/generate', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Generation failed')
    result.value = data.result
    loadHistory()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function download() {
  if (!resultUrl.value) return
  const res = await fetch(resultUrl.value)
  const blob = await res.blob()
  const ext = resultUrl.value.split('.').pop().split('?')[0] || (isVideo.value ? 'mp4' : 'png')
  const filename = `result-${Date.now()}.${ext}`

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Media file', accept: { [blob.type]: [`.${ext}`] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (e) {
      if (e.name === 'AbortError') return
    }
  }

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function extractUrl(r) {
  if (typeof r === 'string' && r.startsWith('http')) return r
  if (Array.isArray(r)) return extractUrl(r[0])
  if (r && typeof r === 'object') {
    return r.result_url ?? r.url ?? r.output_url ?? r.download_url ?? r.image_url ?? r.video_url ?? null
  }
  return null
}

const resultUrl = computed(() => (result.value ? extractUrl(result.value) : null))
const isVideo = computed(
  () => resultUrl.value && (resultUrl.value.includes('.mp4') || !isImageModel.value),
)
const rawResult = computed(() =>
  result.value && !resultUrl.value ? JSON.stringify(result.value, null, 2) : null,
)
</script>

<template>
  <main>
    <!-- Left: form panel -->
    <div class="panel-left">
      <form @submit.prevent="generate">
        <div class="field grow">
          <div class="prompt-header">
            <label for="prompt">PROMPT</label>
            <button
              type="button"
              class="improve-btn"
              :disabled="!prompt.trim() || improving || loading"
              @click="improvePrompt"
            >{{ improving ? 'improving…' : 'improve →' }}</button>
          </div>
          <textarea
            id="prompt"
            v-model="prompt"
            placeholder="describe what to generate"
            :disabled="loading || improving"
          />
          <span v-if="improveError" class="improve-error">! {{ improveError }}</span>
        </div>

        <div class="field">
          <label>REFERENCE IMAGE</label>
          <div
            class="drop-zone"
            :class="{ 'drag-over': isDragOver, 'has-image': referencePreview }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
            @click="fileInput.click()"
          >
            <img v-if="referencePreview" :src="referencePreview" class="ref-preview" alt="reference" />
            <span v-else class="drop-hint">drop image or click to browse</span>
            <button v-if="referencePreview" type="button" class="clear-ref" @click.stop="clearReference">×</button>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="handleFileSelect" hidden />
        </div>

        <div class="row">
          <div class="field">
            <label for="model">MODEL</label>
            <select id="model" v-model="model" :disabled="loading">
              <option value="nano_banana_2">nano_banana_2</option>
              <option value="nano_banana_pro">nano_banana_pro</option>
              <option value="kling3_0">kling3_0</option>
            </select>
          </div>
          <div v-if="isImageModel" class="field">
            <label for="ratio">RATIO</label>
            <select id="ratio" v-model="aspectRatio" :disabled="loading">
              <option>1:1</option>
              <option>16:9</option>
              <option>9:16</option>
              <option>4:3</option>
            </select>
          </div>
        </div>

        <button type="submit" :disabled="!prompt.trim() || loading">
          <span>{{ loading ? 'generating' : 'generate' }}</span>
          <span v-if="loading" class="blink">_</span>
          <span v-else class="arrow">→</span>
        </button>
      </form>

      <div v-if="error" class="error">! {{ error }}</div>
    </div>

    <!-- Right: result panel -->
    <div class="panel-right">
      <div class="result-area">
        <template v-if="resultUrl">
          <video v-if="isVideo" :src="resultUrl" controls class="result-media" />
          <img v-else :src="resultUrl" alt="result" class="result-media" />
          <div class="result-actions">
            <button type="button" class="action-btn" @click="download">download ↓</button>
            <a :href="resultUrl" target="_blank" rel="noopener" class="action-btn">open ↗</a>
          </div>
        </template>
        <pre v-else-if="rawResult" class="raw-result">{{ rawResult }}</pre>
        <span v-else class="empty-hint">{{ loading ? '' : '—' }}</span>
      </div>

      <div v-if="history.length" class="history-strip">
        <button
          v-for="entry in history"
          :key="entry.id"
          class="history-thumb"
          :title="entry.prompt"
          @click="loadFromHistory(entry)"
        >
          <img :src="entry.result_url" :alt="entry.prompt" />
          <span class="history-model">{{ entry.model }}</span>
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: 100%;
  overflow: hidden;
}

/* ── Left panel ── */
.panel-left {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  border-right: 1px solid #ccc8bf;
  overflow-y: auto;
}

form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field.grow {
  flex: 1;
  min-height: 0;
}

label {
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  color: #7a7670;
  flex-shrink: 0;
}

.prompt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.improve-btn {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  background: transparent;
  color: #7a7670;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.1s;
}

.improve-btn:hover:not(:disabled) { color: #1c1a16; }
.improve-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.improve-error {
  font-size: 0.7rem;
  color: #c0392b;
  flex-shrink: 0;
}

textarea {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.88rem;
  background: #f4f1eb;
  color: #1c1a16;
  border: 1px solid #ccc8bf;
  padding: 8px 10px;
  outline: none;
  border-radius: 0;
  width: 100%;
  resize: none;
  line-height: 1.6;
  flex: 1;
  min-height: 0;
  transition: border-color 0.12s;
}

textarea::placeholder { color: #b4b0a8; }
textarea:focus { border-color: #1c1a16; }
textarea:disabled { opacity: 0.45; cursor: not-allowed; }

select {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.88rem;
  background: #f4f1eb;
  color: #1c1a16;
  border: 1px solid #ccc8bf;
  padding: 7px 10px;
  outline: none;
  border-radius: 0;
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 0.12s;
}

select:focus { border-color: #1c1a16; }
select:disabled { opacity: 0.45; cursor: not-allowed; }

.row {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.row .field { flex: 1; }

button[type="submit"] {
  align-self: flex-start;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.88rem;
  background: transparent;
  color: #1c1a16;
  border: 1px solid #1c1a16;
  padding: 7px 16px;
  cursor: pointer;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}

button[type="submit"]:hover:not(:disabled) {
  background: #1c1a16;
  color: #f4f1eb;
}

button[type="submit"]:disabled { opacity: 0.28; cursor: not-allowed; }

.arrow { transition: transform 0.12s; }
button[type="submit"]:hover:not(:disabled) .arrow { transform: translateX(4px); }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.blink { animation: blink 1s step-end infinite; }

.error {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #c0392b;
  font-size: 0.8rem;
  color: #c0392b;
  flex-shrink: 0;
}

/* Drop zone */
.drop-zone {
  border: 1px dashed #ccc8bf;
  cursor: pointer;
  position: relative;
  transition: border-color 0.12s, background 0.12s;
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  flex-shrink: 0;
  overflow: hidden;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #1c1a16;
  background: #eeeae0;
}

.drop-zone.has-image {
  padding: 0;
  border-style: solid;
  height: auto;
  max-height: 180px;
}

.drop-hint {
  font-size: 0.75rem;
  color: #b4b0a8;
}

.ref-preview {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  display: block;
  background: #e8e4dc;
}

.clear-ref {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: #1c1a16;
  color: #f4f1eb;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.8;
  transition: opacity 0.1s;
}

.clear-ref:hover { opacity: 1; }

/* ── Right panel ── */
.panel-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f0ede6;
}

.result-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.result-media {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  animation: rise 0.35s ease;
}

.result-actions {
  position: absolute;
  bottom: 16px;
  right: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-btn {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.72rem;
  color: #7a7670;
  text-decoration: none;
  letter-spacing: 0.03em;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.1s;
}

.action-btn:hover { color: #1c1a16; }

.raw-result {
  font-size: 0.75rem;
  color: #7a7670;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.65;
  padding: 32px;
  overflow-y: auto;
  max-height: 100%;
  width: 100%;
  animation: rise 0.35s ease;
}

.empty-hint {
  font-size: 1.5rem;
  color: #ccc8bf;
  user-select: none;
}

/* ── History strip ── */
.history-strip {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid #ccc8bf;
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  background: #eceae3;
  scrollbar-width: thin;
  scrollbar-color: #ccc8bf transparent;
}

.history-thumb {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border: 1px solid #ccc8bf;
  cursor: pointer;
  background: #e0ddd6;
  position: relative;
  overflow: hidden;
  padding: 0;
  transition: border-color 0.12s;
}

.history-thumb:hover { border-color: #1c1a16; }

.history-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.history-model {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(28, 26, 22, 0.65);
  color: #f4f1eb;
  font-size: 0.48rem;
  letter-spacing: 0.04em;
  padding: 2px 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
