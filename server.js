const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = 3000;

app.use(express.static('public'));

// 用户ID与密码绑定表
const users = {}; // { userId: password }

// 管理员ID（唯一为 Ocean）
const ADMIN_USER = 'Ocean';

// 商品类别配置
const categoryConfig = {
  '核心': 5,
  '角色': 5,
  '碎片': 5,
  '橙色': 5,
  '紫色': 10,
  '蓝色': 20,
  '诺顿炎息': 8,
  '信封': 8,
  '其他': 30
};

// 生成商品
function generateItems() {
  const items = {};
  let id = 1;
  
  for (const [category, count] of Object.entries(categoryConfig)) {
    for (let i = 1; i <= count; i++) {
      items[id] = { 
        name: `${category}${i}`, 
        category,
        active: false, 
        currentPrice: 0, 
        topBidder: '', 
        bids: [] 
      };
      id++;
    }
  }
  
  return items;
}

let items = generateItems();

io.on('connection', (socket) => {
  console.log('📡 用户已连接');

  // 初始发送全部商品状态
  socket.emit('init', { items, categoryConfig });

  // 用户登录验证
  socket.on('login', ({ userId, password }, callback) => {
    if (!users[userId]) {
      users[userId] = password;
      console.log(`🆕 注册用户 ${userId}`);
      return callback({ success: true, isAdmin: userId === ADMIN_USER });
    }
    if (users[userId] === password) {
      return callback({ success: true, isAdmin: userId === ADMIN_USER });
    } else {
      return callback({ success: false, message: '密码错误' });
    }
  });

  // 拍卖启用 / 停止（仅管理员 Ocean）
  socket.on('toggleAuction', ({ userId, itemId, active }) => {
    if (userId !== ADMIN_USER) return;
    if (!items[itemId]) return;
    items[itemId].active = active;
    io.emit('toggleAuction', { itemId, active });
    console.log(`⚙️ 拍卖商品 ${itemId}(${items[itemId].name}) 状态修改为 ${active}`);
  });

  // 一键开启所有拍卖（仅管理员）
  socket.on('startAllAuctions', (userId) => {
    if (userId !== ADMIN_USER) return;
    for (const itemId in items) {
      items[itemId].active = true;
    }
    io.emit('init', { items, categoryConfig });
    console.log('✅ 管理员开启了所有商品的拍卖');
  });

  // 一键关闭所有拍卖（仅管理员）
  socket.on('stopAllAuctions', (userId) => {
    if (userId !== ADMIN_USER) return;
    for (const itemId in items) {
      items[itemId].active = false;
    }
    io.emit('init', { items, categoryConfig });
    console.log('✅ 管理员关闭了所有商品的拍卖');
  });

  // 收到出价请求
  socket.on('placeBid', ({ itemId, name, password, amount }) => {
    if (!items[itemId] || !items[itemId].active) return;
    if (!users[name] || users[name] !== password) return;
    if (amount <= items[itemId].currentPrice) return;

    items[itemId].currentPrice = amount;
    items[itemId].topBidder = name;
    items[itemId].bids.unshift({ name, amount, time: new Date().toLocaleTimeString() });

    // 广播更新给所有用户
    io.emit('update', { itemId, data: items[itemId] });
  });

  // 更新商品类别数量（仅管理员）
  socket.on('updateCategory', ({ userId, category, count }, callback) => {
    if (userId !== ADMIN_USER) return callback({ success: false, message: '无权限' });
    if (typeof count !== 'number' || count < 1 || count > 100) {
      return callback({ success: false, message: '数量必须在1-100之间' });
    }

    categoryConfig[category] = count;
    items = generateItems();
    io.emit('init', { items, categoryConfig });
    console.log(`🔄 管理员更新了 ${category} 类别的数量为 ${count}`);
    callback({ success: true });
  });

  socket.on('disconnect', () => {
    console.log('🔌 用户断开连接');
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});