import http from 'http';

const testUserUpdate = () => {
  // First, get the current users to see the initial state
  console.log('=== Testing GET /api/users ===');
  http.get('http://localhost:5004/api/users', (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('GET Response:', data);
      
      // Then test the PUT request to update the user
      console.log('\n=== Testing PUT /api/users/1 ===');
      const updateData = JSON.stringify({ 
        username: 'admin', 
        role: '超级管理员', 
        status: '启用' 
      });
      
      const options = {
        hostname: 'localhost',
        port: 5004,
        path: '/api/users/1',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': updateData.length
        }
      };
      
      const req = http.request(options, (res) => {
        let putData = '';
        res.on('data', (chunk) => {
          putData += chunk;
        });
        res.on('end', () => {
          console.log('PUT Response:', putData);
          
          // Finally, get the users again to verify the update
          console.log('\n=== Testing GET /api/users (after update) ===');
          http.get('http://localhost:5004/api/users', (res) => {
            let finalData = '';
            res.on('data', (chunk) => {
              finalData += chunk;
            });
            res.on('end', () => {
              console.log('Final GET Response:', finalData);
            });
          }).on('error', (err) => {
            console.error('Final GET Error:', err.message);
          });
        });
      });
      
      req.on('error', (err) => {
        console.error('PUT Error:', err.message);
      });
      
      req.write(updateData);
      req.end();
    });
  }).on('error', (err) => {
    console.error('Initial GET Error:', err.message);
  });
};

testUserUpdate();
