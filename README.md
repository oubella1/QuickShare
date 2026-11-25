# QuickShare

A local frontend project built with React, Tailwind CSS 4, and Vite. It includes light and dark themes, Send and Receive tabs, multi-file selection with drag and drop, a pairing UI, and a connection and progress panel.

## Run locally

Install Node.js 22.12 or newer. Open a terminal in this folder and run:

```sh
npm install
npm run dev
```

Open the local address printed by Vite. On Windows PowerShell, use `npm.cmd` in place of `npm` if script execution is blocked.

Build with `npm run build` and serve the built files locally with `npm run preview`.

## Try the interface

- In Send files, choose or drop one or more files. Remove any file with the cross next to it.
- Select Preview pairing code to render a six-digit example and a scannable QR that decodes to preview text. The example code cannot connect devices.
- In Receive files, type or paste a six-digit code and select Join with code. The app explains that joining needs the transfer integration.
- Use the header button to switch themes. The preference is saved in the browser.

Files stay in browser memory. Connection remains Disconnected and progress remains at 0% with the current stubs.

## Where to continue

- `src/main.jsx` contains the interface and local state. The send action currently creates a local preview code.
- `src/styles.css` contains the theme colors and component styles. Tailwind utilities handle the layout and spacing in the JSX.
- `src/transfer.js` has the TODOs for backend session creation, WebSocket signaling, WebRTC, and file transfer. Both entry points accept a React state updater. Publish a real session as `session: { code, qrPayload }` and update `connection`, `phase`, and `progress` from actual transfer events. Return a user-facing `message` from each entry point. Once real pairing is wired in, remove the local preview generation and update the Send button label.
