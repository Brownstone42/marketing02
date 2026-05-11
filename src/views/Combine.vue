<script setup>
import { ref, computed } from 'vue'

const prompt = ref('')
const model = ref('flux_kontext')
const aspectRatio = ref('9:16')
const loading = ref(false)
const result = ref(null)
const error = ref(null)

const image1File = ref(null)
const image1Preview = ref(null)
const image1Input = ref(null)

const image2File = ref(null)
const image2Preview = ref(null)
const image2Input = ref(null)

const MODELS = [
  { value: 'flux_kontext',    label: 'Flux Kontext' },
  { value: 'nano_banana_2',   label: 'Nano Banana Pro' },
  { value: 'kling_omni_image', label: 'Kling O1 Image' },
  { value: 'gpt_image_2',     label: 'GPT Image 2' },
]

function setFile(slot, file) {
  if (!file || !file.type.startsWith('image/')) return
  if (slot === 1) {
    image1File.value = file
    const r = new FileReader()
    r.onload = (e) => (image1Preview.value = e.target.result)
    r.readAsDataURL(file)
  } else {
    image2File.value = file
    const r = new FileReader()
    r.onload = (e) => (image2Preview.value = e.target.result)
    r.readAsDataURL(file)
  }
}

function clearFile(slot) {
  if (slot === 1) {
    image1File.value = null
    image1Preview.value = null
    if (image1Input.value) image1Input.value.value = ''
  } else {
    image2File.value = null
    image2Preview.value = null
    if (image2Input.value) image2Input.value.value = ''
  }
}

const canGenerate = computed(
  () => prompt.value.trim() && image1File.value && image2File.value && !loading.value,
)

async function generate() {
  if (!canGenerate.value) return
  loading.value = true
  result.value = null
  error.value = null

  try {
    const fd = new FormData()
    fd.append('prompt', prompt.value.trim())
    fd.append('model', model.value)
    fd.append('aspect_ratio', aspectRatio.value)
    fd.append('image1', image1File.value)
    fd.append('image2', image2File.value)

    const res = await fetch('/api/combine', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Generation failed')
    result.value = data.result
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const resultUrl = computed(() => {
  const r = result.value
  if (!r) return null
  if (typeof r === 'string' && r.startsWith('http')) return r
  const entry = Array.isArray(r) ? r[0] : r
  return entry?.result_url ?? null
})

async function download() {
  if (!resultUrl.value) return
  const res = await fetch(resultUrl.value)
  const blob = await res.blob()
  const filename = `combine-${Date.now()}.png`
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Image', accept: { 'image/png': ['.png'] } }],
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
</script>

<template>
  <main>
    <div class="panel-left">
      <form @submit.prevent="generate">

        <!-- Two image zones -->
        <div class="zones-row">
          <div class="field" v-for="slot in [1, 2]" :key="slot">
            <label>IMAGE {{ slot }}</label>
            <div
              class="drop-zone"
              :class="{ 'has-image': slot === 1 ? image1Preview : image2Preview }"
              @click="slot === 1 ? image1Input.click() : image2Input.click()"
              @dragover.prevent
              @drop.prevent="setFile(slot, $event.dataTransfer.files[0])"
            >
              <img
                v-if="slot === 1 ? image1Preview : image2Preview"
                :src="slot === 1 ? image1Preview : image2Preview"
                class="zone-preview"
                alt=""
              />
              <span v-else class="drop-hint">drop or click</span>
              <button
                v-if="slot === 1 ? image1Preview : image2Preview"
                type="button"
                class="clear-btn"
                @click.stop="clearFile(slot)"
              >×</button>
            </div>
          </div>
        </div>
        <input ref="image1Input" type="file" accept="image/*" @change="setFile(1, $event.target.files[0])" hidden />
        <input ref="image2Input" type="file" accept="image/*" @change="setFile(2, $event.target.files[0])" hidden />

        <!-- Prompt -->
        <div class="field grow">
          <label for="prompt">PROMPT</label>
          <textarea
            id="prompt"
            v-model="prompt"
            placeholder="describe how to combine or what to do with the images"
            :disabled="loading"
          />
        </div>

        <!-- Model + Ratio -->
        <div class="row">
          <div class="field">
            <label for="model">MODEL</label>
            <select id="model" v-model="model" :disabled="loading">
              <option v-for="m in MODELS" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="field">
            <label for="ratio">RATIO</label>
            <select id="ratio" v-model="aspectRatio" :disabled="loading">
              <option>1:1</option>
              <option>16:9</option>
              <option>9:16</option>
              <option>4:3</option>
            </select>
          </div>
        </div>

        <button type="submit" :disabled="!canGenerate">
          <span>{{ loading ? 'generating…' : 'generate' }}</span>
          <span v-if="!loading" class="arrow">→</span>
          <span v-else class="blink">_</span>
        </button>
      </form>

      <div v-if="error" class="error">! {{ error }}</div>
    </div>

    <div class="panel-right">
      <div class="result-area">
        <template v-if="resultUrl">
          <img :src="resultUrl" alt="result" class="result-media" />
          <div class="result-actions">
            <button type="button" class="action-btn" @click="download">download ↓</button>
            <a :href="resultUrl" target="_blank" rel="noopener" class="action-btn">open ↗</a>
          </div>
        </template>
        <span v-else class="empty-hint">{{ loading ? '' : '—' }}</span>
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

.field { display: flex; flex-direction: column; gap: 5px; }
.field.grow { flex: 1; min-height: 0; }

label {
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  color: #7a7670;
  flex-shrink: 0;
}

/* Two zones side by side */
.zones-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.drop-zone {
  border: 1px dashed #ccc8bf;
  cursor: pointer;
  position: relative;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s, background 0.12s;
  overflow: hidden;
}

.drop-zone:hover { border-color: #1c1a16; background: #eeeae0; }
.drop-zone.has-image { border-style: solid; height: auto; }
.drop-hint { font-size: 0.65rem; color: #b4b0a8; text-align: center; padding: 0 6px; }

.zone-preview {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
  display: block;
  background: #e8e4dc;
}

.clear-btn {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 16px;
  height: 16px;
  background: #1c1a16;
  color: #f4f1eb;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  opacity: 0.8;
}

.clear-btn:hover { opacity: 1; }

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

.row { display: flex; gap: 10px; flex-shrink: 0; }
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

button[type="submit"]:hover:not(:disabled) { background: #1c1a16; color: #f4f1eb; }
button[type="submit"]:disabled { opacity: 0.28; cursor: not-allowed; }

.arrow { transition: transform 0.12s; }
button[type="submit"]:hover:not(:disabled) .arrow { transform: translateX(4px); }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
.blink { animation: blink 1s step-end infinite; }

.error {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #c0392b;
  font-size: 0.8rem;
  color: #c0392b;
  flex-shrink: 0;
}

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
  object-fit: contain;
  display: block;
}

.result-actions {
  position: absolute;
  bottom: 16px;
  right: 20px;
  display: flex;
  gap: 10px;
}

.action-btn {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.72rem;
  color: #7a7670;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.1s;
}

.action-btn:hover { color: #1c1a16; }

.empty-hint {
  font-size: 1.5rem;
  color: #ccc8bf;
  user-select: none;
}
</style>
