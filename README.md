# QuickShare

Open index.html in your browser to try the interface. The page uses HTML, CSS, and plain JavaScript and runs without npm.

- index.html contains the Send and Receive forms and the transfer status panel.
- src/styles.css controls the layout and themes.
- src/app.js handles file selection, drag and drop, code previews, and screen updates.
- src/transfer.js contains the starting points for backend sessions, WebSocket signaling, and WebRTC file transfer.

Choose files and click Preview pairing code to see a local six-digit example. Use the Receive tab to try entering a code. The connection stays disconnected until the transfer logic is connected.
