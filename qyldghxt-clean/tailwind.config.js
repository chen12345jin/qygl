/**
 * Tailwind CSS 配置文件
 * 
 * 配置说明：
 * - content: 定义需要处理的文件范围
 * - theme: 自定义主题配置
 *   - colors: 自定义颜色方案
 *   - spacing: 自定义间距
 *   - 其他主题扩展
 * 
 * 用途：
 * - 定制UI主题和样式
 * - 确保样式的一致性
 * - 优化构建过程中的CSS生成
 */

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      }
    },
  },
  plugins: [],
}
