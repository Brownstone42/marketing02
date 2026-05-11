<script setup>
import { ref, onMounted } from 'vue'

const history = ref([])
const selected = ref(null)
const noteDraft = ref('')
const saving = ref(false)

onMounted(async () => {
  const res = await fetch('/api/history')
  if (res.ok) history.value = await res.json()
  if (history.value.length) select(history.value[0])
})

function select(entry) {
  selected.value = entry
  noteDraft.value = entry.note || ''
}

function ratingLabel(r) {
  if (r === 1) return 'good'
  if (r === -1) return 'bad'
  return 'unrated'
}

function ratingDot(r) {
  if (r === 1) return 'dot-good'
  if (r === -1) return 'dot-bad'
  return ''
}

async function setRating(entry, value) {
  const next = entry.rating === value ? 0 : value
  entry.rating = next
  if (selected.value?.id === entry.id) selected.value = entry
  await fetch(`/api/history/${entry.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: next }),
  })
}

async function deleteEntry() {
  if (!selected.value) return
  const id = selected.value.id
  await fetch(`/api/history/${id}`, { method: 'DELETE' })
  const idx = history.value.findIndex((e) => e.id === id)
  history.value.splice(idx, 1)
  const next = history.value[idx] ?? history.value[idx - 1] ?? null
  selected.value = next
  noteDraft.value = next?.note || ''
}

async function download() {
  if (!selected.value?.result_url) return
  const url = selected.value.result_url
  const res = await fetch(url)
  const blob = await res.blob()
  const ext = url.split('.').pop().split('?')[0] || (isVideo(selected.value) ? 'mp4' : 'png')
  const filename = `result-${selected.value.id}.${ext}`

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

async function saveNote() {
  if (!selected.value) return
  saving.value = true
  selected.value.note = noteDraft.value
  const entry = history.value.find((e) => e.id === selected.value.id)
  if (entry) entry.note = noteDraft.value
  await fetch(`/api/history/${selected.value.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: noteDraft.value }),
  })
  saving.value = false
}

function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const isVideo = (entry) =>
  entry.result_url?.includes('.mp4') || entry.model === 'kling3_0'
</script>

<template>
  <main>
    <!-- Left: thumbnail grid -->
    <div class="panel-left">
      <p class="count">{{ history.length }} generation{{ history.length !== 1 ? 's' : '' }}</p>
      <div v-if="!history.length" class="empty">no history yet</div>
      <div class="grid">
        <button
          v-for="entry in history"
          :key="entry.id"
          class="thumb"
          :class="{ active: selected?.id === entry.id }"
          @click="select(entry)"
          :title="entry.prompt"
        >
          <img :src="entry.result_url" :alt="entry.prompt" />
          <span v-if="entry.rating !== 0" :class="['rating-dot', ratingDot(entry.rating)]" />
        </button>
      </div>
    </div>

    <!-- Right: detail panel -->
    <div class="panel-right">
      <template v-if="selected">
        <div class="media-area">
          <video v-if="isVideo(selected)" :src="selected.result_url" controls class="media" />
          <img v-else :src="selected.result_url" alt="result" class="media" />
        </div>

        <div class="detail">
          <div class="meta-row">
            <span class="meta">{{ selected.model }}</span>
            <span class="meta" v-if="selected.aspect_ratio">{{ selected.aspect_ratio }}</span>
            <span class="meta">{{ formatDate(selected.timestamp) }}</span>
            <button type="button" class="action-btn" @click="download">download ↓</button>
            <a :href="selected.result_url" target="_blank" rel="noopener" class="action-btn">open ↗</a>
          </div>

          <div class="field">
            <label>PROMPT</label>
            <p class="prompt-text">{{ selected.prompt }}</p>
          </div>

          <div class="field">
            <label>RATING</label>
            <div class="rating-row">
              <button
                class="rate-btn"
                :class="{ active: selected.rating === 1 }"
                @click="setRating(selected, 1)"
              >good ↑</button>
              <button
                class="rate-btn"
                :class="{ active: selected.rating === -1 }"
                @click="setRating(selected, -1)"
              >bad ↓</button>
              <span class="rating-state">{{ ratingLabel(selected.rating) }}</span>
            </div>
          </div>

          <div class="field grow">
            <label>NOTE</label>
            <textarea
              v-model="noteDraft"
              placeholder="what worked, what didn't..."
              @blur="saveNote"
            />
            <div class="note-actions">
              <button type="button" class="save-btn" @click="saveNote" :disabled="saving">
                {{ saving ? 'saving…' : 'save note' }}
              </button>
              <button type="button" class="delete-btn" @click="deleteEntry">delete</button>
            </div>
          </div>
        </div>
      </template>
      <span v-else class="empty-hint">—</span>
    </div>
  </main>
</template>

<style scoped>
main {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100%;
  overflow: hidden;
}

/* ── Left: grid ── */
.panel-left {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #ccc8bf;
  overflow: hidden;
}

.count {
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  color: #7a7670;
  padding: 12px 14px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid #e8e4dc;
}

.empty {
  font-size: 0.8rem;
  color: #b4b0a8;
  padding: 24px 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
}

.thumb {
  aspect-ratio: 1;
  border: 1px solid #ccc8bf;
  cursor: pointer;
  background: #e0ddd6;
  position: relative;
  overflow: hidden;
  padding: 0;
  transition: border-color 0.12s;
}

.thumb:hover { border-color: #7a7670; }
.thumb.active { border-color: #1c1a16; border-width: 2px; }

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rating-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-good { background: #4a7c59; }
.dot-bad  { background: #c0392b; }

/* ── Right: detail ── */
.panel-right {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f0ede6;
}

.media-area {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #eceae3;
}

.media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.detail {
  flex-shrink: 0;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid #ccc8bf;
  max-height: 45%;
  overflow-y: auto;
}

.meta-row {
  display: flex;
  gap: 14px;
  flex-shrink: 0;
}

.meta {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: #7a7670;
}

.action-btn {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: #7a7670;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.1s;
  margin-left: auto;
}

.action-btn + .action-btn { margin-left: 12px; }
.action-btn:hover { color: #1c1a16; }

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

.prompt-text {
  font-size: 0.82rem;
  line-height: 1.55;
  color: #1c1a16;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-btn {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.78rem;
  background: transparent;
  color: #7a7670;
  border: 1px solid #ccc8bf;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.12s;
}

.rate-btn:hover { border-color: #1c1a16; color: #1c1a16; }
.rate-btn.active { background: #1c1a16; color: #f4f1eb; border-color: #1c1a16; }

.rating-state {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: #b4b0a8;
  margin-left: 4px;
}

textarea {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.82rem;
  background: #f4f1eb;
  color: #1c1a16;
  border: 1px solid #ccc8bf;
  padding: 7px 10px;
  outline: none;
  border-radius: 0;
  width: 100%;
  resize: none;
  line-height: 1.55;
  min-height: 60px;
  transition: border-color 0.12s;
}

textarea::placeholder { color: #b4b0a8; }
textarea:focus { border-color: #1c1a16; }

.save-btn {
  align-self: flex-start;
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.72rem;
  background: transparent;
  color: #7a7670;
  border: 1px solid #ccc8bf;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.12s;
  flex-shrink: 0;
}

.note-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.save-btn:hover:not(:disabled) { border-color: #1c1a16; color: #1c1a16; }
.save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.delete-btn {
  font-family: 'Courier Prime', 'Courier New', monospace;
  font-size: 0.72rem;
  background: transparent;
  color: #c0392b;
  border: 1px solid #e8bcb8;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.12s;
}

.delete-btn:hover { background: #c0392b; color: #f4f1eb; border-color: #c0392b; }

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.5rem;
  color: #ccc8bf;
  user-select: none;
}
</style>
