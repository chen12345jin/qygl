import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'rollup-plugin-obfuscator'

export default defineConfig(({ mode }) => {
  const clientPort = Number(process.env.VITE_PORT || 3003)
  const apiPort = Number(process.env.VITE_API_PORT || 5004)
  return {
    base: './',
    plugins: [
      react(),
      mode === 'production'
        ? obfuscator({
            global: true,
            options: {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.4,
              deadCodeInjection: true,
              deadCodeInjectionThreshold: 0.1,
              stringArray: true,
              rotateStringArray: true,
              shuffleStringArray: true,
              stringArrayThreshold: 0.5,
              debugProtection: false,
              disableConsoleOutput: false
            }
          })
        : null
    ].filter(Boolean),
    server: {
      port: clientPort,
      // 固定端口；若被占用则报错
      strictPort: true,
      hmr: { overlay: false },
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true
        },
        '/socket.io': {
          target: `http://localhost:${apiPort}`,
          ws: true,
          changeOrigin: true
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            pdf: ['jspdf', 'html2canvas'],
            router: ['react-router-dom'],
            ui: ['lucide-react', 'react-hot-toast'],
            utils: ['axios', 'date-fns', 'xlsx']
          }
        }
      },
      // 启用压缩
      minify: 'terser',
      // 生成source map用于调试
      sourcemap: false,
      // 设置chunk大小警告限制
      chunkSizeWarningLimit: 1000
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'recharts']
    }
  }
})
