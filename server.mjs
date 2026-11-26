import { createHash, randomInt } from 'node:crypto'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'



const sessions = new Map()


const frontend = {
  '/': ['index.html', 'text/html'],
  '/src/styles.css': ['src/styles.css', 'text/css'],
  '/src/app.js': ['src/app.js', 'text/javascript'],
  '/src/transfer.js': ['src/transfer.js', 'text/javascript'],
}

function createSession() {
  let code
  do {
    code = String(randomInt(100000, 1000000))
  } while (sessions.has(code))

  sessions.set(code, { createdAt: Date.now() })
  return { code }
}

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/sessions') {
    res.writeHead(201, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(createSession()))
    return
  }


  if (req.method === 'POST' && req.url === '/sessions/join') {
    let body = ''
    try {
      for await (const chunk of req) {
        body += chunk
        if (body.length > 1024) {
          res.writeHead(413).end()
          return
        }
      }
    } catch {
      return
    }

    let code
    try {
      code = JSON.parse(body)?.code
    } catch {
      res.writeHead(400).end()
      return
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      res.writeHead(400).end()
      return
    }

    const session = sessions.get(code)
    if (!session) {
      res.writeHead(404).end()
      return
    }

    session.receiverJoined = true
    if (session.senderSocket) notifySender(session.senderSocket)
    res.writeHead(200).end()
    return
  }

  if (req.method === 'GET' && Object.hasOwn(frontend, req.url)) {
  const [file, contentType] = frontend[req.url]
  const content = readFileSync(new URL(file, import.meta.url))

  res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' })
  res.end(content)
  return
}

  res.writeHead(404)
  res.end('Not found')
})

const joinedMessage = Buffer.from(JSON.stringify({ type: 'receiver-joined' }))

function notifySender(socket) {
  if (socket.writable) {
    // One short, unmasked text frame sent by the server.
    socket.write(Buffer.concat([Buffer.from([0x81, joinedMessage.length]), joinedMessage]))
  }
}

server.on('upgrade', (req, socket) => {
  const match = /^\/sessions\/(\d{6})\/events$/.exec(req.url)
  const session = match && sessions.get(match[1])
  const key = req.headers['sec-websocket-key']

  if (!session || req.headers.upgrade?.toLowerCase() !== 'websocket'
      || req.headers['sec-websocket-version'] !== '13'
      || !/^[A-Za-z0-9+/]{22}==$/.test(key)) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
    return
  }

  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64')

  session.senderSocket?.destroy()
  session.senderSocket = socket
  socket.on('error', () => socket.destroy())
  socket.on('close', () => {
    if (session.senderSocket === socket) session.senderSocket = null
  })
  // This notification channel only sends messages. End it when the client sends a frame.
  socket.once('data', () => socket.end(Buffer.from([0x88, 0])))
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n'
    + 'Connection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n')
  if (session.receiverJoined) notifySender(socket)
})

const port = Number(process.env.QUICKSHARE_PORT ?? 3000)
server.listen(port, '127.0.0.1', () => {
  console.log('QuickShare API: http://127.0.0.1:' + port)
})



