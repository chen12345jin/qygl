import fs from 'fs';
import path from 'path';

// 读取server/index.js文件内容
const serverFilePath = path.join(process.cwd(), 'server', 'index.js');
const content = fs.readFileSync(serverFilePath, 'utf8');

// 提取mockData定义
const mockDataRegex = /const mockData = \{[\s\S]*?\n\};/;
const match = content.match(mockDataRegex);

if (match) {
  // 提取mockData对象字符串
  let mockDataStr = match[0].replace('const mockData = ', '');
  mockDataStr = mockDataStr.replace(/;$/, '');
  
  try {
    // 评估mockData对象
    const mockData = eval('(' + mockDataStr + ')');
    
    console.log('各数据类型数量:');
    console.log('-' .repeat(30));
    
    let totalItems = 0;
    for (const key in mockData) {
      const count = Array.isArray(mockData[key]) ? mockData[key].length : 0;
      totalItems += count;
      console.log(`${key}: ${count} 条`);
    }
    
    // 计算总数据大小
    const snapshot = {
      createdAt: new Date().toISOString(),
      annual_work_plans: mockData.annual_work_plans,
      major_events: mockData.major_events,
      monthly_progress: mockData.monthly_progress,
      departments: mockData.departments,
      employees: mockData.employees,
      action_plans: mockData.action_plans,
      notifications: mockData.notifications,
      users: mockData.users,
      target_types: mockData.target_types,
      templates: mockData.templates
    };
    
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const totalSize = Buffer.byteLength(jsonStr, 'utf8');
    
    console.log('-' .repeat(30));
    console.log(`总条目数: ${totalItems} 条`);
    console.log(`备份数据大小: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`备份数据行数: ${jsonStr.split('\n').length} 行`);
    
  } catch (error) {
    console.error('解析mockData失败:', error.message);
  }
} else {
  console.log('未找到mockData定义');
}
