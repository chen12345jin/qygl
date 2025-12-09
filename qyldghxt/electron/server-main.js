import { app } from 'electron'

// 服务端安装包的主程序不需要做任何事，甚至不需要显示界面
// 它的唯一作用是作为安装包的载体，实际的服务注册由 NSIS 脚本在安装过程中完成
// 如果用户误触运行了这个 exe，直接退出即可
app.whenReady().then(() => {
  app.quit()
})
