const initialTransfer = {
  connection: 'Disconnected',
  phase: 'Idle',
  progress: 0,
  session: null,
}

function createLocalPreviewCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

let senderSocket

function closeSenderEvents() {
  senderSocket?.close()
  senderSocket = null
}

function watchReceiver(code, updateTransfer) {
  closeSenderEvents()
  const url = new URL('/sessions/' + code + '/events', location.href)
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = new WebSocket(url)
  senderSocket = socket

  socket.addEventListener('message', event => {
    if (senderSocket === socket && JSON.parse(event.data).type === 'receiver-joined') {
      updateTransfer(current => ({ ...current, phase: 'Receiver joined' }))
    }
  })
}

async function startSend(files, updateTransfer) {
  const response = await fetch('/sessions', { method: 'POST' })

  if (!response.ok) {
    throw new Error('Could not create the session')
  }

  const { code } = await response.json()

  updateTransfer(current => ({
    ...current,
    session: { code },
    phase: 'Waiting for receiver',
  }))

  watchReceiver(code, updateTransfer)
  return { message: 'Session created. Share the code with the receiver.' }
}

async function startReceive(code, updateTransfer) {
  const response = await fetch('/sessions/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (response.status === 400) return { message: 'Enter a six-digit code.' }
  if (response.status === 404) return { message: 'Code not found.' }
  if (!response.ok) throw new Error('Could not check the code')

  // TODO(WebSocket): Connect to signaling and negotiate the peer connection.
  // TODO(WebRTC): Receive, verify, and assemble file chunks.
  // TODO(Transfer): Publish received-byte progress and make completed files downloadable.
  return { message: 'Code accepted. File transfer is not connected yet.' }
}

