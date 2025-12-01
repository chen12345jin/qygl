import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    // 固定端口为 3003；若被占用则直接报错，不自动切换
    strictPort: true,
    hmr: { overlay: false },
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5004',
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
})
