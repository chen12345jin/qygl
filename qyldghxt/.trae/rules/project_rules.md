一、技术栈适配原则
前端技术限定：所有方案必须基于 react、react-dom、react-router-dom 实现，状态管理仅使用项目现有 Context（DataContext、AuthContext、SocketContext），禁止推荐 Redux/MobX 等非项目技术。
样式实现规范：样式必须通过 tailwindcss 实现，优先使用 @apply 在 src/index.css 中进行组件化定义，保持与现有样式体系一致。
数据交互要求：接口请求使用 axios，实时通信基于 socket.io-client，需遵循前端代理配置（/api、/socket.io 指向 http://localhost:5004）。
工具库约束：文件处理（Excel）用 xlsx，PDF / 截图用 html2canvas + jspdf，文件上传用 react-dropzone 配合后端 multer，禁止引入其他同类库。
构建与运行：涉及环境配置需适配 vite 及 manualChunks 模块切分规则，脚本调用遵循 package.json 中的 dev/build/preview 规范。

二、核心任务实现指南
1. 必填项与红色星号
所有模块（首页概览、部门目标分解等 13 个模块）中，除 “备注” 外的字段均需标记为必填。
红色星号实现：通过 tailwindcss 样式（text-red-500）在字段标签后添加 *，示例：
jsx
<label className="flex items-center">
  部门名称
  <span className="ml-1 text-red-500">*</span>
</label>
需在 DataContext 中统一维护各模块必填字段列表，便于表单验证复用。
2. 内联提示与表单验证
内联提示实现：替换现有提示方式，在输入框下方通过条件渲染展示提示文本（如 {error && <span className="text-red-500 text-sm mt-1 block">{error}</span>}）。
验证逻辑：基于组件内状态或 Context 实现，包含：
非空验证（必填字段）
格式验证（如手机号、邮箱，使用正则）
业务规则验证（如 “年度规划表” 的日期范围合理性）
验证触发时机：输入框失焦（onBlur）、表单提交前，禁止使用外部 UI 框架的验证组件，保持手工实现与现有 DeleteConfirmDialog 等组件风格一致。
3. 真实 API 对接
移除所有模拟数据（如 qyldghxt-clean/server.js 中的内存数据），通过 axios 调用后端真实接口。
接口路径需遵循后端业务路由（部门 / 员工 / 登录等），示例：
jsx
// 替换模拟数据获取
const fetchDepartments = async () => {
  const res = await axios.get('/api/departments');
  setDepartments(res.data);
};
数据同步：通过 DataContext 统一管理接口返回数据，确保组件间数据一致性；实时数据（如动态更新的目标进度）通过 SocketContext 中的 socket.io-client 实现。
4. 导出导入功能
导出功能：基于 xlsx（Excel）、jspdf + html2canvas（PDF）实现，按钮点击事件绑定导出逻辑，示例：
jsx
// Excel导出（参考 utils/export.js）
const handleExport = () => {
  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '部门数据');
  XLSX.writeFile(workbook, '部门数据.xlsx');
};
导入功能：结合 react-dropzone 实现文件上传，通过 xlsx 解析文件内容后调用后端导入接口（/api/import），需处理格式校验和错误提示。
需确保所有模块的导出 / 导入按钮状态正确（如无数据时禁用），并对接后端存储逻辑。
5. 筛选功能调整
位置调整：将筛选功能从页面下方移至右上角按钮群最左侧，样式与现有按钮群（如新增、删除）统一（使用 tailwindcss 布局）。
多级筛选：实现筛选下拉菜单的嵌套逻辑（一级筛选展开二级筛选），基于当前页面字段动态生成筛选选项（如 “部门管理” 页显示 “部门类型”“创建时间” 等筛选条件）。
数据关联：筛选条件变更时，通过 axios 重新请求接口（携带筛选参数），更新 Context 中的数据并刷新页面。
6. UI 优化规范
布局：使用 tailwindcss 的网格（grid）、弹性盒（flex）优化页面结构，确保响应式适配。
组件风格：统一按钮（@apply 定义的按钮样式）、表单元素、弹窗（参考 DeleteConfirmDialog）的视觉风格，增强一致性。
图表优化：基于 recharts 调整图表配色、图例位置，确保与系统整体风格协调。
交互细节：添加按钮悬停效果（hover: 前缀）、表单输入反馈，优化加载状态（如骨架屏或 react-hot-toast 提示）。
7. 按钮功能实现
所有按钮（新增、编辑、删除、筛选、导出等）需绑定有效事件处理函数，禁止空点击。
业务逻辑：
操作类按钮（新增 / 编辑）：打开对应表单弹窗（手工实现，非 UI 框架 Modal）。
删除按钮：触发 DeleteConfirmDialog 确认后调用删除接口。
权限相关按钮：结合 AuthContext 中的权限信息控制显示 / 禁用状态。
状态管理：按钮点击后的加载、成功 / 失败状态通过 react-hot-toast 提示反馈。
8. 代码清理规则
移除未使用的文件：包括废弃组件（如未引用的 .jsx 文件）、冗余工具函数（utils 中未调用的方法）、过期样式（index.css 中未使用的 @apply 定义）。
清理无效代码：删除注释掉的代码、未使用的变量 / 状态、重复逻辑，简化 Context 中未被引用的状态 / 方法。
保持结构清晰：确保剩余代码符合项目现有目录结构（src/pages、src/components、src/contexts 等），依赖项在 package.json 中保持精简。

三、联调与问题排查
后端接口对接时，优先检查 vite.config.js 中的代理配置是否正确，确保 /api 请求指向 http://localhost:5004。
socket.io 连接问题：通过 SocketContext 中的 socket.connected 状态排查，确保客户端与后端 socket.io 服务正常通信。
样式冲突：使用 tailwindcss 的 @layer 隔离组件样式，通过浏览器开发者工具定位冲突类名并调整。
数据一致性：若前端展示与数据库不一致，优先检查接口返回数据、Context 数据更新逻辑，排除缓存或未正确触发重新渲染的问题。
性能问题：通过浏览器控制台的网络面板、Performance 标签排查接口请求耗时，使用 React Developer Tools 分析组件渲染瓶颈。
调试技巧：利用 console.log 追踪函数执行流程、打印关键变量，结合断点调试（在 Chrome DevTools 中设置）。

四、响应规范
回答需结合项目技术栈具体实现（如提供基于 react + tailwind 的代码片段），避免抽象概念。
涉及多模块通用逻辑（如必填项处理、筛选组件），优先提供可复用的组件或 Context 方法。
针对具体模块（如 “年度规划图表”），需关联 recharts 实现细节，确保方案可直接落地。

五、测试与验收
1. 功能测试：确保所有模块的必填项、表单验证、API 请求、导出导入、筛选等功能按预期工作。
2. 性能测试：检查页面加载速度、接口响应时间，确保系统在高并发场景下的稳定性。
3. 兼容性测试：在不同浏览器（如 Chrome、Firefox、Safari）和设备（如桌面、平板、手机）上测试，确保响应式布局和交互流畅。
4. 用户测试：邀请不同职能（如管理层、普通员工）的用户进行试用，收集反馈并优化。
5. 文档更新：根据本次迭代新增或修改的功能，在项目文档中添加使用说明和注意事项。
6. 代码审查：组织团队成员进行代码走查，确保无安全漏洞和潜在问题。
7. 部署上线：在测试环境验证无误后，将代码部署到生产环境，确保系统稳定运行。

六、github仓库的代码不要动，不要提交到我的仓库。

七、回答我的问题全部用中文回答。