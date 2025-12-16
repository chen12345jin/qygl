window.SERVER_CONFIG = {
  // 后端API地址，留空则使用相对路径（同域部署）
  // 示例: 'http://192.168.1.100:5004' 或 'http://your-server.com:5004'
  BASE_URL: 'http://192.168.1.26:5004',
  
  // 是否禁用登录（仅开发调试用）
  DISABLE_LOGIN: false,
  
  // 更新服务器地址（用于客户端自动更新）
  // 留空则自动从 BASE_URL 推断，格式: 'http://服务器IP:5004/updates/'
  UPDATE_URL: 'http://192.168.1.26:5004/updates/'
}
