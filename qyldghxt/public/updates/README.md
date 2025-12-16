# 自动更新文件存放目录

此目录用于存放客户端自动更新所需的文件。

## 发布新版本步骤

1. **修改版本号**
   编辑 `package.json`，将 `version` 字段改为新版本号（如 `1.0.5`）

2. **打包客户端**
   ```bash
   npm run build:client
   ```

3. **复制更新文件**
   打包完成后，从 `azb/版本号/release/client/` 目录复制以下文件到此目录：
   - `Client-Setup-版本号.exe` - 安装包
   - `latest.yml` - 版本信息文件（必须！）

4. **部署到服务器**
   将此目录的文件上传到服务器的 `public/updates/` 目录

## 文件说明

- `latest.yml` - 包含版本号、文件名、SHA512哈希等信息，electron-updater 依赖此文件判断是否有新版本
- `*.exe` - Windows 安装包

## 注意事项

- `latest.yml` 文件名必须是 `latest.yml`，不能改名
- 每次发布新版本都要同时更新 `.exe` 和 `latest.yml`
- 确保服务器的 `/updates/` 路径可以正常访问这些文件
