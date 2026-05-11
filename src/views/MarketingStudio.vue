<script setup>
import { ref, computed, onMounted } from 'vue'

const prompt = ref('')
const mode = ref('ugc')
const aspectRatio = ref('9:16')
const duration = ref(10)
const loading = ref(false)
const result = ref(null)
const error = ref(null)

const productFile = ref(null)
const productPreview = ref(null)
const productInput = ref(null)

const avatars = ref([])
const selectedAvatar = ref(null)

const MODES = [
  { value: 'ugc', label: 'UGC' },
  { value: 'ugc_how_to', label: 'Tutorial' },
  { value: 'ugc_unboxing', label: 'Unboxing' },
  { value: 'product_showcase', label: 'Product Showcase' },
  { value: 'product_review', label: 'Product Review' },
  { value: 'tv_spot', label: 'TV Spot' },
  { value: 'wild_card', label: 'Wild Card' },
  { value: 'ugc_virtual_try_on', label: 'UGC Virtual Try-On' },
  { value: 'virtual_try_on', label: 'Pro Virtual Try-On' },
]

onMounted(async () => {
  try {
    const res = await fetch('/api/studio/avatars')
    if (res.ok) {
      avatars.value = await res.json()
      selectedAvatar.value = avatars.value[0] ?? null
    }
  } catch {}
})

function setProductFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  productFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => (productPreview.value = e.target.result)
  reader.readAsDataURL(file)
}

function clearProduct() {
  productFile.value = null
  productPreview.value = null
  if (productInput.value) productInput.value.value = ''
}

const canGenerate = computed(() => prompt.value.trim() && productFile.value && selectedAvatar.value && !loading.value)

async function generate() {
  if (!canGenerate.value) return
  loading.value = true
  result.value = null
  error.value = null

  try {
    const fd = new FormData()
    fd.append('prompt', prompt.value.trim())
    fd.append('mode', mode.value)
    fd.append('aspect_ratio', aspectRatio.value)
    fd.append('duration', String(duration.value))
    fd.append('avatar_id', selectedAvatar.value.id)
    fd.append('avatar_type', selectedAvatar.value.type)
    fd.append('product_image', productFile.value)

    const res = await fetch('/api/marketing-studio', { method: 'POST', body: fd })
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
  const filename = `studio-${Date.now()}.mp4`
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Video', accept: { 'video/mp4': ['.mp4'] } }],
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

        <!-- Product image -->
        <div class="field">
          <label>PRODUCT IMAGE</label>
          <div
            class="drop-zone"
            :class="{ 'has-image': productPreview }"
            @click="productInput.click()"
            @dragover.prevent
            @drop.prevent="setProductFile($event.dataTransfer.files[0])"
          >
            <img v-if="productPreview" :src="productPreview" class="ref-preview" alt="product" />
            <span v-else class="drop-hint">drop or click to upload product image</span>
            <button v-if="productPreview" type="button" class="clear-ref" @click.stop="clearProduct">×</button>
          </div>
          <input ref="productInput" type="file" accept="image/*" @change="setProductFile($event.target.files[0])" hidden />
        </div>

        <!-- Avatar picker -->
        <div class="field">
          <label>AVATAR</label>
          <div class="avatar-grid">
            <button
              v-for="av in avatars"
              :key="av.id"
              type="button"
              class="avatar-btn"
              :class="{ active: selectedAvatar?.id === av.id }"
              :title="av.name"
              @click="selectedAvatar = av"
            >
              <img :src="av.preview_url" :alt="av.name" />
              <span class="av-name">{{ av.name }}</span>
            </button>
          </div>
        </div>

        <!-- Prompt -->
        <div class="field grow">
          <label for="prompt">PROMPT</label>
          <textarea
            id="prompt"
            v-model="prompt"
            placeholder="describe the ad scene or brief"
            :disabled="loading"
          />
        </div>

        <!-- Mode -->
        <div class="field">
          <label for="mode">MODE</label>
          <select id="mode" v-model="mode" :disabled="loading">
            <option v-for="m in MODES" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>

        <!-- Ratio + Duration -->
        <div class="row">
          <div class="field">
            <label for="ratio">RATIO</label>
            <select id="ratio" v-model="aspectRatio" :disabled="loading">
              <option>16:9</option>
              <option>9:16</option>
              <option>1:1</option>
            </select>
          </div>
          <div class="field">
            <label for="dur">DURATION (s)</label>
            <input id="dur" type="number" v-model.number="duration" min="4" max="60" :disabled="loading" />
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
          <video :src="resultUrl" controls class="result-media" />
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

/* Product drop zone */
.drop-zone {
  border: 1px dashed #ccc8bf;
  cursor: pointer;
  position: relative;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s, background 0.12s;
  overflow: hidden;
  flex-shrink: 0;
}

.drop-zone:hover { border-color: #1c1a16; background: #eeeae0; }
.drop-zone.has-image { border-style: solid; height: auto; }
.drop-hint { font-size: 0.7rem; color: #b4b0a8; }

.ref-preview {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
  display: block;
  background: #e8e4dc;
}

.clear-ref {
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

.clear-ref:hover { opacity: 1; }

/* Avatar grid */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  flex-shrink: 0;
}

.avatar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px;
  border: 1px solid #ccc8bf;
  background: #eceae3;
  cursor: pointer;
  transition: border-color 0.12s;
}

.avatar-btn:hover { border-color: #7a7670; }
.avatar-btn.active { border-color: #1c1a16; border-width: 2px; background: #e8e4dc; }

.avatar-btn img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.av-name {
  font-size: 0.5rem;
  letter-spacing: 0.04em;
  color: #7a7670;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

/* Form fields */
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

select, input[type="number"] {
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

select:focus, input[type="number"]:focus { border-color: #1c1a16; }
select:disabled, input[type="number"]:disabled { opacity: 0.45; cursor: not-allowed; }

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

/* Right panel */
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
