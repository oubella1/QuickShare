import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDownToLine, ArrowUpFromLine, File, Moon, QrCode, Sun, UploadCloud, X, Zap,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createLocalPreviewCode, initialTransfer, startReceive, startSend } from './transfer'
import './styles.css'

function fileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3)
  return new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(bytes / 1024 ** unit)
    + ' ' + ['B', 'KB', 'MB', 'GB'][unit]
}

function readTheme() {
  try {
    const saved = localStorage.getItem('quickshare-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // System preference still works when storage is unavailable.
  }
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const tabs = [
  { id: 'send', label: 'Send files', icon: ArrowUpFromLine },
  { id: 'receive', label: 'Receive files', icon: ArrowDownToLine },
]

function App() {
  const [theme, setTheme] = useState(readTheme)
  const [tab, setTab] = useState('send')
  const [files, setFiles] = useState([])
  const [previewCode, setPreviewCode] = useState('')
  const [receiveCode, setReceiveCode] = useState('')
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [transfer, setTransfer] = useState(initialTransfer)
  const fileInput = useRef(null)
  const dragDepth = useRef(0)
  const nextFileId = useRef(0)
  const tabButtons = useRef({})
  document.documentElement.dataset.theme = theme

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('quickshare-theme', next) } catch { /* Theme remains set for this visit. */ }
  }

  function selectTab(next) {
    if (next === tab) return
    setTab(next)
    setNotice('')
    dragDepth.current = 0
    setDragging(false)
  }

  function handleTabKey(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'send' : event.key === 'End' ? 'receive' : tab === 'send' ? 'receive' : 'send'
    selectTab(next)
    tabButtons.current[next].focus()
  }

  function addFiles(incoming) {
    const items = Array.from(incoming, file => ({ id: nextFileId.current++, file }))
    if (!items.length) return
    setFiles(current => [...current, ...items])
    setPreviewCode('')
    setNotice('')
  }

  function removeFile(id) {
    setFiles(current => current.filter(item => item.id !== id))
    setPreviewCode('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy || (tab === 'send' ? !files.length : receiveCode.length !== 6)) return
    setBusy(true)
    setNotice('')
    try {
      if (tab === 'send') {
        setPreviewCode(createLocalPreviewCode())
        const result = await startSend(files.map(item => item.file), setTransfer)
        setNotice(result.message)
      } else {
        const result = await startReceive(receiveCode, setTransfer)
        setNotice(result.message)
      }
    } catch {
      setNotice('The request could not be started. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const pairingCode = transfer.session?.code || previewCode
  const qrPayload = transfer.session?.qrPayload || (previewCode && 'QuickShare UI preview only: ' + previewCode)
  const isSend = tab === 'send'

  return (
    <div className="min-h-dvh">
      <header className="site-header">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3 font-bold"><span className="brand-icon"><Zap size={19} fill="currentColor" /></span>QuickShare</div>
          <button type="button" className="icon-button theme-button" onClick={toggleTheme} aria-label={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode'}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-8 sm:pt-15">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Share files</h1>
          <p className="muted mt-3 text-base">Choose files to send or enter a six-digit code to receive.</p>
        </div>
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <section className="panel min-w-0 p-4 sm:p-6" aria-label="File sharing">
            <div className="tab-list grid grid-cols-2 gap-1 p-1" role="tablist" aria-label="Transfer direction" onKeyDown={handleTabKey}>
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} ref={element => { tabButtons.current[id] = element }} type="button" id={id + '-tab'} role="tab"
                  aria-selected={tab === id} aria-controls="sharing-panel" tabIndex={tab === id ? 0 : -1} onClick={() => selectTab(id)}>
                  <Icon size={17} /> {label}
                </button>
              ))}
            </div>

            <form id="sharing-panel" role="tabpanel" aria-labelledby={tab + '-tab'} className="mt-5" onSubmit={handleSubmit}>
              {isSend ? (
                <>
                  <div className={'drop-zone ' + (dragging ? 'dragging' : '')}
                    onDragEnter={event => {
                      event.preventDefault()
                      if (!event.dataTransfer.types.includes('Files')) return
                      dragDepth.current += 1
                      setDragging(true)
                    }}
                    onDragOver={event => {
                      event.preventDefault()
                      if (event.dataTransfer.types.includes('Files')) event.dataTransfer.dropEffect = 'copy'
                    }}
                    onDragLeave={event => {
                      event.preventDefault()
                      dragDepth.current = Math.max(0, dragDepth.current - 1)
                      if (!dragDepth.current) setDragging(false)
                    }}
                    onDrop={event => {
                      event.preventDefault()
                      dragDepth.current = 0
                      setDragging(false)
                      addFiles(event.dataTransfer.files)
                    }}>
                    <span className="section-icon"><UploadCloud size={24} /></span>
                    <p className="mt-3 font-semibold">Drop your files here</p>
                    <p className="muted mt-1 mb-4 text-sm">or choose them from your device</p>
                    <button type="button" className="secondary-button" onClick={() => fileInput.current.click()}>Browse files</button>
                    <input ref={fileInput} type="file" hidden multiple onChange={event => {
                      addFiles(event.target.files)
                      event.target.value = ''
                    }} />
                  </div>
                  {!!files.length && <ul className="mt-4 grid gap-2" aria-label="Selected files">
                    {files.map(({ id, file }) => <li className="file-row flex min-w-0 items-center gap-3" key={id}>
                      <File size={18} className="muted shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium" title={file.name}>{file.name}</span>
                        <span className="muted text-xs">{fileSize(file.size)}</span>
                      </span>
                      <button type="button" className="icon-button shrink-0" aria-label={'Remove ' + file.name} onClick={() => removeFile(id)}><X size={17} /></button>
                    </li>)}
                  </ul>}
                </>
              ) : (
                <div className="receive-box">
                  <label className="block font-semibold" htmlFor="receive-code">Six-digit code</label>
                  <p id="receive-help" className="muted mt-1 text-sm">Enter the code from the sender.</p>
                  <input id="receive-code" className="code-input mt-4 w-full" type="text" inputMode="numeric" autoComplete="off"
                    aria-describedby="receive-help" placeholder="000000" value={receiveCode}
                    onChange={event => {
                      setReceiveCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                      setNotice('')
                    }} />
                </div>
              )}
              <button className="primary-button mt-5 w-full" type="submit" disabled={busy || (isSend ? !files.length : receiveCode.length !== 6)}>
                {isSend ? <QrCode size={18} /> : <ArrowDownToLine size={18} />}
                {isSend ? 'Preview pairing code' : 'Join with code'}
              </button>
              <p className="muted mt-3 text-center text-xs" role="status">{notice || (isSend ? 'Files stay on this device in preview.' : 'Joining requires the transfer integration.')}</p>
            </form>
          </section>

          <aside className="grid min-w-0 gap-5">
            <section className="panel p-5 sm:p-6" aria-labelledby="pairing-title">
              <div className="flex items-center gap-3">
                <span className="section-icon small"><QrCode size={17} /></span>
                <h2 id="pairing-title" className="font-semibold">Pairing code</h2>
              </div>
              {pairingCode ? (
                <div className="mt-5 text-center">
                  {qrPayload && <div className="qr-frame mx-auto w-fit"><QRCodeSVG value={qrPayload} size={120} marginSize={2} title={transfer.session ? 'Pairing QR code' : 'Preview QR code'} /></div>}
                  <p className="pair-code mt-3" aria-label={'Pairing code ' + pairingCode.split('').join(' ')}>{pairingCode}</p>
                  {!transfer.session && <p className="muted mt-2 text-xs">Local preview. Cannot pair devices.</p>}
                </div>
              ) : <p className="muted mt-4 text-sm">Add files and preview how the QR and six-digit code will appear.</p>}
            </section>
            <section className="panel p-5 sm:p-6" aria-labelledby="status-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="status-title" className="font-semibold">Transfer status</h2>
                <span className="status-pill" role="status"><span aria-hidden="true" />{transfer.connection}</span>
              </div>
              <label htmlFor="transfer-progress" className="muted mt-5 mb-2 flex justify-between gap-3 text-sm">
                <span>{transfer.phase === 'Idle' ? 'Waiting to start' : transfer.phase}</span><span>{transfer.progress}%</span>
              </label>
              <progress id="transfer-progress" className="block w-full" max="100" value={transfer.progress} />
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
