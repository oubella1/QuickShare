const byId = id => document.getElementById(id)
const fileInput = byId('files')
const fileList = byId('file-list')
const dropZone = byId('drop-zone')
const codeInput = byId('receive-code')
const submitButton = byId('submit')

let direction = 'send'
let files = []
let transfer = initialTransfer
let busy = false
let dragDepth = 0

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  byId('theme').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode'
}

const systemTheme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
let savedTheme
try { savedTheme = localStorage.getItem('quickshare-theme') } catch {}
setTheme(['light', 'dark'].includes(savedTheme) ? savedTheme : systemTheme)

byId('theme').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  setTheme(theme)
  try { localStorage.setItem('quickshare-theme', theme) } catch {}
})

function showNotice(message = '') {
  const hint = direction === 'send'
    ? (location.origin === 'http://127.0.0.1:3000' ? 'Files stay on this device until transfer is connected.' : 'Run node server.mjs and open http://127.0.0.1:3000 to create a code.')
    : 'Enter the six-digit code from the sender.'
  byId('notice').textContent = message || hint
}

function updateButton() {
  const sending = direction === 'send'
  submitButton.textContent = sending ? 'Create pairing code' : 'Join with code'
  submitButton.disabled = busy || (sending ? files.length === 0 : codeInput.value.length !== 6)
}

function selectDirection(next) {
  direction = next
  for (const mode of ['send', 'receive']) {
    byId(mode).setAttribute('aria-pressed', String(mode === next))
    byId(mode + '-fields').hidden = mode !== next
  }
  updateButton()
  showNotice()
}

byId('send').addEventListener('click', () => selectDirection('send'))
byId('receive').addEventListener('click', () => selectDirection('receive'))
codeInput.addEventListener('input', () => {
  codeInput.value = codeInput.value.replace(/[^0-9]/g, '').slice(0, 6)
  updateButton()
  showNotice()
})

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(bytes / 1024 ** unit)
    + ' ' + ['B', 'KB', 'MB', 'GB'][unit]
}

function renderFiles() {
  fileList.replaceChildren()
  files.forEach((file, index) => {
    const row = document.createElement('li')
    row.className = 'file-row'
    const details = document.createElement('div')
    const name = document.createElement('div')
    name.textContent = file.name
    const size = document.createElement('small')
    size.className = 'muted'
    size.textContent = formatSize(file.size)
    details.append(name, size)

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'icon-button'
    removeButton.textContent = '×'
    removeButton.setAttribute('aria-label', 'Remove ' + file.name)
    removeButton.addEventListener('click', () => {
      files.splice(index, 1)
      filesChanged()
      const nextRow = fileList.children[Math.min(index, files.length - 1)]
      const nextButton = nextRow?.querySelector('button') ?? byId('browse')
      nextButton.focus()
    })
    row.append(details, removeButton)
    fileList.append(row)
  })
  fileList.hidden = files.length === 0
}

function renderTransfer() {
  const code = transfer.session?.code || ''
  byId('pair-code').textContent = code
  byId('pair-code').hidden = !code
  byId('pair-hint').hidden = Boolean(transfer.session?.code)
  byId('connection').textContent = transfer.connection
  byId('phase').textContent = transfer.phase === 'Idle' ? 'Waiting to start' : transfer.phase
  byId('percent').textContent = transfer.progress + '%'
  byId('transfer-progress').value = transfer.progress
}

function updateTransfer(next) {
  transfer = typeof next === 'function' ? next(transfer) : next
  renderTransfer()
}

function filesChanged() {
  closeSenderEvents()
  updateTransfer({ ...transfer, session: null, phase: 'Idle' })
  renderFiles()
  renderTransfer()
  updateButton()
  showNotice()
}

function addFiles(incoming) {
  if (!incoming.length) return
  files.push(...incoming)
  filesChanged()
}

byId('browse').addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files)
  fileInput.value = ''
})

dropZone.addEventListener('dragenter', event => {
  event.preventDefault()
  if (!event.dataTransfer.types.includes('Files')) return
  dragDepth += 1
  dropZone.classList.add('dragging')
})
dropZone.addEventListener('dragover', event => event.preventDefault())
dropZone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) dropZone.classList.remove('dragging')
})
dropZone.addEventListener('drop', event => {
  event.preventDefault()
  dragDepth = 0
  dropZone.classList.remove('dragging')
  addFiles(event.dataTransfer.files)
})

byId('sharing').addEventListener('submit', async event => {
  event.preventDefault()
  if (submitButton.disabled) return
  const submittedDirection = direction
  busy = true
  updateButton()
  showNotice()

  try {
    let result
    if (submittedDirection === 'send') {
    
      result = await startSend([...files], updateTransfer)
    } else {
      result = await startReceive(codeInput.value, updateTransfer)
    }
    if (direction === submittedDirection) showNotice(result.message)
  } catch {
    if (direction === submittedDirection) showNotice('Could not contact the QuickShare server. Run node server.mjs and open http://127.0.0.1:3000.')
  } finally {
    busy = false
    updateButton()
  }
})

selectDirection('send')



