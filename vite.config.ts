import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'copy-assets',
      writeBundle() {
        // Copy manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json')
        
        // Copy icons directory
        const iconsSource = 'src/assets/icons'
        const iconsTarget = 'dist/icons'
        
        if (existsSync(iconsSource)) {
          // Create target directory if it doesn't exist
          mkdirSync(iconsTarget, { recursive: true })
          // Copy all icon files
          cpSync(iconsSource, iconsTarget, { recursive: true })
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        // Extension entry points
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/sidepanel.html'),
        workspace: resolve(__dirname, 'src/workspace/workspace.html'),
        newtab: resolve(__dirname, 'src/newtab/newtab.html'),
        // Background scripts
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        // Content scripts
        'content-script': resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep specific naming for background and content scripts
          if (chunkInfo.name === 'service-worker') {
            return 'background/service-worker.js'
          }
          if (chunkInfo.name === 'content-script') {
            return 'content/content-script.js'
          }
          return '[name].js'
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.html')) {
            return '[name].[ext]'
          }
          return 'assets/[name].[hash].[ext]'
        },
        // Manual chunking to optimize bundle sizes
        manualChunks: {
          // React and related libraries
          'react-vendor': ['react', 'react-dom'],
          // Lucide icons (large icon library)
          'icons': ['lucide-react'],
          // Shared utilities and contexts
          'shared': [
            './src/shared/contexts/AppContext',
            './src/shared/hooks/useTabs',
            './src/shared/components/index'
          ],
          // AI and processing utilities
          'ai-utils': [
            './src/utils/ai-processor',
            './src/utils/storage-manager'
          ]
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    // Ensure we don't bundle Chrome APIs
    target: 'es2017',
    minify: process.env['NODE_ENV'] === 'production',
    // Increase chunk size warning limit for Chrome extensions
    chunkSizeWarningLimit: 800,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
      '@background': resolve(__dirname, 'src/background'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
      '@options': resolve(__dirname, 'src/options'),
      '@sidepanel': resolve(__dirname, 'src/sidepanel'),
      '@workspace': resolve(__dirname, 'src/workspace'),
    }
  },
  define: {
    // Required for Chrome extension environment
    global: 'globalThis',
  },
  // Disable HMR for production builds
  server: {
    hmr: process.env['NODE_ENV'] !== 'production'
  }
})