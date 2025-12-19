import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5004,
  path: '/api/system-settings',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
  res.on('end', () => {
    console.log('\n响应结束');
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

req.end();