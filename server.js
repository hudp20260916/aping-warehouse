const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据文件路径（支持环境变量配置，适配 Render 等平台）
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(dataDir, 'warehouse.json');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 默认数据
function getDefaultData() {
  const now = Date.now();
  return {
    products: [
      { id: 'P001', code: 'P001', name: '通用产品A', spec: '标准款', perBox: 10, safetyStock: 50, isCustom: false, createTime: now },
      { id: 'P002', code: 'P002', name: '通用产品B', spec: '加强款', perBox: 20, safetyStock: 30, isCustom: false, createTime: now },
      { id: 'P003', code: 'P003', name: '定制产品X', spec: '客户定制', perBox: 5, safetyStock: 10, isCustom: true, createTime: now },
    ],
    warehouses: [
      { id: 'W001', code: 'W001', name: '主仓', type: 'normal', status: 'active', bindCustomer: '', isDefault: true, createTime: now },
      { id: 'W002', code: 'W002', name: '定制仓-甲客户', type: 'custom', status: 'active', bindCustomer: '甲客户', isDefault: false, createTime: now },
    ],
    stockInOrders: [],
    stockOutOrders: [],
    transferOrders: [],
    stockFlow: [],
    users: [
      { id: 'U001', username: 'admin', password: '123456', displayName: '管理员', role: 'admin', status: 'active', remark: '系统管理员' },
      { id: 'U002', username: 'operator', password: '123456', displayName: '操作员小王', role: 'operator', status: 'active', remark: '仓库操作员' },
    ],
    operationLogs: [],
    backupLogs: [],
    ocrLogs: [],
    settings: {
      transferEnabled: true,
      appName: '阿平仓库管理',
    },
    _lastUpdate: now
  };
}

// 读取数据
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('读取数据失败:', e);
  }
  return getDefaultData();
}

// 保存数据
function saveData(data) {
  try {
    data._lastUpdate = Date.now();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('保存数据失败:', e);
    return false;
  }
}

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API: 获取数据
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

// API: 保存数据
app.post('/api/data', (req, res) => {
  const data = req.body;
  if (data && data.users) {
    const success = saveData(data);
    if (success) {
      res.json({ success: true, message: '保存成功' });
    } else {
      res.status(500).json({ success: false, message: '保存失败' });
    }
  } else {
    res.status(400).json({ success: false, message: '数据格式错误' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 所有其他路由都返回 index.html（SPA）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`阿平仓库管理系统运行在 http://localhost:${PORT}`);
  console.log(`默认账号: admin / 123456`);
});
