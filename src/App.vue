<script setup>
import { ref, computed } from 'vue'

const prompt = ref('')
const model = ref('nano_banana_2')
const aspectRatio = ref('1:1')
const loading = ref(false)
const result = ref(null)
const error = ref(null)

const IMAGE_MODELS = ['nano_banana_2', 'nano_banana_pro']
const isImageModel = computed(() => IMAGE_MODELS.includes(model.value))

async function generate() {
  if (!prompt.value.trim() || loading.value) return
  loading.value = true
  result.value = null
  error.value = null

  try {
    const body = {
      prompt: prompt.value.trim(),
      model: model.value,
      options: isImageModel.value ? { aspect_ratio: aspectRatio.value } : {},
    }
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Generation failed')
    result.value = data.result
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function extractUrl(r) {
  if (typeof r === 'string' && r.startsWith('http')) return r
  if (r && typeof r === 'object') {
    return r.url ?? r.output_url ?? r.download_url ?? r.image_url ?? r.video_url ?? null
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
    <p class="eyebrow">higgsfield / generate</p>

    <form @submit.prevent="generate">
      <div class="field">
        <label for="prompt">PROMPT</label>
        <textarea
          id="prompt"
          v-model="prompt"
          placeholder="describe what to generate"
          rows="5"
          :disabled="loading"
        />
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

    <div v-if="resultUrl" class="output">
      <video v-if="isVideo" :src="resultUrl" controls />
      <img v-else :src="resultUrl" alt="result" />
      <a :href="resultUrl" target="_blank" rel="noopener">open full size ↗</a>
    </div>

    <pre v-if="rawResult" class="output raw">{{ rawResult }}</pre>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #f4f1eb;
  color: #1c1a16;
  font-family: 'Courier Prime', 'Courier New', monospace;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
main {
  max-width: 580px;
  margin: 0 auto;
  padding: 72px 24px 96px;
}

.eyebrow {
  font-size: 0.78rem;
  color: #7a7670;
  letter-spacing: 0.05em;
  margin-bottom: 48px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

label {
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: #7a7670;
}

textarea,
select {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.95rem;
  background: #f4f1eb;
  color: #1c1a16;
  border: 1px solid #ccc8bf;
  padding: 10px 12px;
  outline: none;
  border-radius: 0;
  width: 100%;
  transition: border-color 0.12s;
  appearance: none;
  -webkit-appearance: none;
}

textarea {
  resize: vertical;
  line-height: 1.65;
}

textarea::placeholder {
  color: #b4b0a8;
}

textarea:focus,
select:focus {
  border-color: #1c1a16;
}

textarea:disabled,
select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.row {
  display: flex;
  gap: 16px;
}

.row .field {
  flex: 1;
}

button {
  align-self: flex-start;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.9rem;
  background: transparent;
  color: #1c1a16;
  border: 1px solid #1c1a16;
  padding: 9px 18px;
  cursor: pointer;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.12s, color 0.12s;
}

button:hover:not(:disabled) {
  background: #1c1a16;
  color: #f4f1eb;
}

button:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}

.arrow {
  transition: transform 0.12s;
}

button:hover:not(:disabled) .arrow {
  transform: translateX(4px);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.blink {
  animation: blink 1s step-end infinite;
}

.error {
  margin-top: 28px;
  padding-top: 12px;
  border-top: 1px solid #c0392b;
  font-size: 0.85rem;
  color: #c0392b;
}

.output {
  margin-top: 44px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: rise 0.35s ease;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.output img,
.output video {
  width: 100%;
  display: block;
  border: 1px solid #ccc8bf;
}

.output a {
  font-size: 0.75rem;
  color: #7a7670;
  text-decoration: none;
  letter-spacing: 0.03em;
  transition: color 0.1s;
}

.output a:hover {
  color: #1c1a16;
}

.output.raw {
  margin-top: 44px;
  font-size: 0.78rem;
  color: #7a7670;
  border-top: 1px solid #ccc8bf;
  padding-top: 18px;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.65;
  animation: rise 0.35s ease;
}
</style>
