export const initialTransfer = {
  connection: 'Disconnected',
  phase: 'Idle',
  progress: 0,
  session: null,
}

export function createLocalPreviewCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

export async function startSend(files, updateTransfer) {
  // TODO(Backend): Create a session and get its real pairing code and QR payload.
  // TODO(WebSocket): Connect to signaling and exchange offers, answers, and ICE candidates.
  // TODO(WebRTC): Open a data channel and send the selected files.
  // TODO(Transfer): Publish measured progress, errors, and acknowledged completion.
  return { message: 'Sending becomes available after you connect the transfer logic.' }
}

export async function startReceive(code, updateTransfer) {
  // TODO(Backend): Validate the code and join the sender's session.
  // TODO(WebSocket): Connect to signaling and negotiate the peer connection.
  // TODO(WebRTC): Receive, verify, and assemble file chunks.
  // TODO(Transfer): Publish received-byte progress and make completed files downloadable.
  return { message: 'Joining becomes available after you connect the transfer logic.' }
}