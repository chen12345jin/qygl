import axios from 'axios';

// 测试服务器URL
const BASE_URL = 'http://localhost:5004/api';

// 测试用户信息
const USER_INFO = {
  username: 'admin',
  role: 'admin'
};

// 模拟业务操作的测试用例
const testCases = [
  {
    name: '创建部门',
    method: 'POST',
    path: '/departments',
    data: {
      name: '测试部门',
      code: 'TEST_DEPT',
      parent_id: null,
      status: 'active'
    }
  },
  {
    name: '更新部门',
    method: 'PUT',
    path: '/departments/1',
    data: {
      name: '更新后的测试部门',
      status: 'active'
    }
  },
  {
    name: '删除部门',
    method: 'DELETE',
    path: '/departments/1'
  }
];

// 执行测试
async function runTests() {
  console.log('开始测试日志记录功能...');
  console.log('='.repeat(50));

  // 为每个请求添加用户信息头部
  const axiosInstance = axios.create({
    headers: {
      'X-User-Name': USER_INFO.username,
      'X-User-Role': USER_INFO.role
    }
  });

  // 执行所有测试用例
  for (const testCase of testCases) {
    console.log(`\n测试: ${testCase.name}`);
    console.log(`方法: ${testCase.method}`);
    console.log(`路径: ${testCase.path}`);
    
    try {
      let response;
      
      switch (testCase.method) {
        case 'GET':
          response = await axiosInstance.get(`${BASE_URL}${testCase.path}`);
          break;
        case 'POST':
          response = await axiosInstance.post(`${BASE_URL}${testCase.path}`, testCase.data);
          break;
        case 'PUT':
          response = await axiosInstance.put(`${BASE_URL}${testCase.path}`, testCase.data);
          break;
        case 'DELETE':
          response = await axiosInstance.delete(`${BASE_URL}${testCase.path}`);
          break;
        default:
          throw new Error(`不支持的HTTP方法: ${testCase.method}`);
      }
      
      console.log(`状态: ${response.status} ${response.statusText}`);
      console.log('✓ 请求成功');
    } catch (error) {
      console.error(`✗ 请求失败: ${error.message}`);
      if (error.response) {
        console.error(`  状态码: ${error.response.status}`);
        console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('测试完成！请检查日志文件是否有相应记录。');
  console.log('日志文件路径: d:\\qygl\\qyldghxt\\temp_store\\audit_logs.json');
}

// 运行测试
runTests();
