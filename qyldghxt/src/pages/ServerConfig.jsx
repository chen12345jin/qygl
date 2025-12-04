import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const ServerConfig = () => {
  const navigate = useNavigate()
  const [ip, setIp] = useState(localStorage.getItem('SERVER_URL') || '')
  const [status, setStatus] = useState('idle')

  async function testConnection() {
    setStatus('testing')
    try {
      const base = (ip || '').trim().replace(/\/+$/,'')
      if (!base) {
        setStatus('error')
        toast.error('请输入服务器地址')
        return
      }
      const url = `${base}/api/health`
      const res = await axios.get(url, { timeout: 8000 })
      if (res.data && String(res.data.status) === 'ok') {
        localStorage.setItem('SERVER_URL', base)
        setStatus('success')
        toast.success('连接成功，配置已保存')
        navigate('/login', { replace: true })
        return
      }
      setStatus('error')
      toast.error('连接失败，请检查服务端是否可用')
    } catch (_) {
      setStatus('error')
      toast.error('连接失败，请检查地址或防火墙设置')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <div className="text-xl font-semibold mb-4">服务器配置</div>
        <div className="mb-3 text-sm text-gray-600">请输入服务端地址（如 `http://192.168.1.100:3000` 或域名）</div>
        <input
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="http://192.168.1.100:3000"
          className="w-full border rounded-xl px-4 h-11 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={testConnection}
            className="px-5 h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            {status === 'testing' ? '连接中...' : '测试并保存'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-5 h-11 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
          >返回登录</button>
        </div>
      </div>
    </div>
  )
}

export default ServerConfig

