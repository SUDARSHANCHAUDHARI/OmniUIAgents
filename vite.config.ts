import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'

// Electron is only wired up when ELECTRON=1 (the `desktop` script).
// Plain `vite dev` stays a pure browser app so Path 1 (direct API) works standalone.
const withElectron = process.env.ELECTRON === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(withElectron
      ? [
          electron({
            main: { entry: 'electron/main.ts' },
            preload: { input: path.join(__dirname, 'electron/preload.ts') },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
