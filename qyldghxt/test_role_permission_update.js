import http from 'http';

// 测试角色权限更新时自动更新用户权限的功能
const testRolePermissionUpdate = () => {
  console.log('=== 测试角色权限更新时自动更新用户权限 ===');
  
  // 1. 首先获取当前的角色列表，找到要测试的角色
  console.log('\n1. 获取当前角色列表...');
  http.get('http://localhost:5004/api/roles', (res) => {
    let rolesData = '';
    res.on('data', (chunk) => {
      rolesData += chunk;
    });
    res.on('end', () => {
      const roles = JSON.parse(rolesData);
      console.log(`   找到 ${roles.length} 个角色`);
      
      // 选择第一个角色进行测试（或创建一个新角色）
      const testRole = roles[0] || {
        name: '测试角色',
        code: 'test_role',
        permissions: ['dashboard', 'profile']
      };
      
      console.log(`   测试角色: ${testRole.name}`);
      
      // 2. 创建一个测试用户，关联到该角色
      console.log('\n2. 创建测试用户，关联到测试角色...');
      const testUser = {
        username: 'test_user',
        password: 'test123',
        role: testRole.name,
        department: '测试部门'
      };
      
      const createUserOptions = {
        hostname: 'localhost',
        port: 5004,
        path: '/api/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(testUser))
        }
      };
      
      const createUserReq = http.request(createUserOptions, (res) => {
        let userData = '';
        res.on('data', (chunk) => {
          userData += chunk;
        });
        res.on('end', () => {
          const createdUser = JSON.parse(userData);
          console.log(`   创建成功: ${createdUser.username}`);
          
          // 3. 更新角色的权限
          console.log('\n3. 更新测试角色的权限...');
          const updatedRole = {
            ...testRole,
            permissions: ['dashboard', 'profile', 'data_analysis', 'notifications']
          };
          
          const updateRoleOptions = {
            hostname: 'localhost',
            port: 5004,
            path: `/api/roles/${testRole.id}`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(JSON.stringify(updatedRole))
            }
          };
          
          const updateRoleReq = http.request(updateRoleOptions, (res) => {
            let roleUpdateData = '';
            res.on('data', (chunk) => {
              roleUpdateData += chunk;
            });
            res.on('end', () => {
              const updatedRoleResult = JSON.parse(roleUpdateData);
              console.log(`   角色权限更新成功: ${updatedRoleResult.permissions.join(', ')}`);
              
              // 4. 检查用户权限是否自动更新
              console.log('\n4. 检查用户权限是否自动更新...');
              http.get('http://localhost:5004/api/users', (res) => {
                let usersData = '';
                res.on('data', (chunk) => {
                  usersData += chunk;
                });
                res.on('end', () => {
                  const users = JSON.parse(usersData);
                  const targetUser = users.find(user => user.username === 'test_user');
                  
                  if (targetUser) {
                    console.log(`   用户 ${targetUser.username} 的当前权限: ${targetUser.permissions?.join(', ') || '无权限'}`);
                    console.log(`   角色 ${updatedRoleResult.name} 的当前权限: ${updatedRoleResult.permissions.join(', ')}`);
                    
                    // 验证用户权限是否与角色权限匹配
                    const permissionsMatch = JSON.stringify(targetUser.permissions) === JSON.stringify(updatedRoleResult.permissions);
                    if (permissionsMatch) {
                      console.log('✅ 测试通过: 用户权限已自动更新为角色的最新权限！');
                    } else {
                      console.log('❌ 测试失败: 用户权限未自动更新！');
                    }
                  } else {
                    console.log('❌ 未找到测试用户');
                  }
                  
                  // 5. 清理测试数据（可选）
                  console.log('\n5. 清理测试数据...');
                  if (targetUser) {
                    const deleteUserOptions = {
                      hostname: 'localhost',
                      port: 5004,
                      path: `/api/users/${targetUser.id}`,
                      method: 'DELETE'
                    };
                    
                    http.request(deleteUserOptions, (res) => {
                      res.on('end', () => {
                        console.log('   测试用户已删除');
                      });
                    }).end();
                  }
                });
              }).on('error', (err) => {
                console.error('   获取用户列表失败:', err.message);
              });
            });
          });
          
          updateRoleReq.on('error', (err) => {
            console.error('   更新角色权限失败:', err.message);
          });
          
          updateRoleReq.write(JSON.stringify(updatedRole));
          updateRoleReq.end();
        });
      });
      
      createUserReq.on('error', (err) => {
        console.error('   创建测试用户失败:', err.message);
      });
      
      createUserReq.write(JSON.stringify(testUser));
      createUserReq.end();
    });
  }).on('error', (err) => {
    console.error('   获取角色列表失败:', err.message);
  });
};

testRolePermissionUpdate();
