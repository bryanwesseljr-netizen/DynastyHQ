import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Legacy's rivalry ledger predates the high-school tape-evaluation workflow.
// Those evaluation records intentionally have no opponent, so protect the
// legacy workspace from treating them like college/coach H2H games.
const legacyGameLogSafety = () => ({
  name: 'dynastyhq-legacy-game-log-safety',
  enforce: 'pre',
  transform(code, id) {
    if (!/[\\/]src[\\/]App\.jsx$/.test(id)) return null

    const target = `const h2h = appState.gameLogs.reduce((acc, log) => {
        const opp = log.opponent.trim();`

    if (!code.includes(target)) return null

    const replacement = `const legacyGameLogs = (Array.isArray(appState.gameLogs) ? appState.gameLogs : [])
      .filter((log) => log && log.stage !== 'high-school' && !log.evaluation && String(log.opponent || '').trim());

    const h2h = legacyGameLogs.reduce((acc, log) => {
        const opp = String(log.opponent || '').trim();`

    return {
      code: code.replace(target, replacement),
      map: null,
    }
  },
})

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
  plugins: [
    legacyGameLogSafety(),
    react(),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase-storage',
              test: /node_modules[\\/](@firebase[\\/]storage|firebase[\\/]storage)[\\/]/,
              priority: 5,
            },
            {
              name: 'firebase-firestore',
              test: /node_modules[\\/](@firebase[\\/]firestore|firebase[\\/]firestore)[\\/]/,
              priority: 4,
            },
            {
              name: 'firebase',
              test: /node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 3,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            {
              name: 'icons',
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 2,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 1,
              maxSize: 350 * 1024,
            },
          ],
        },
      },
    },
  },
})
