const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL 数据库连接（Render 会自动提供 DATABASE_URL 环境变量）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

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

// 初始化数据库表
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_data (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查是否已有数据，没有就插入默认数据
    const result = await pool.query('SELECT data FROM warehouse_data WHERE id = 1');
    if (result.rows.length === 0) {
      const defaultData = getDefaultData();
      await pool.query('INSERT INTO warehouse_data (id, data) VALUES (1, $1)', [JSON.stringify(defaultData)]);
      console.log('已初始化默认数据');
    }
    console.log('数据库初始化成功');
  } catch (e) {
    console.error('数据库初始化失败:', e);
    console.log('将使用文件存储作为备用方案');
  }
}

// 从数据库读取数据（带文件备用）
async function readData() {
  try {
    const result = await pool.query('SELECT data FROM warehouse_data WHERE id = 1');
    if (result.rows.length > 0) {
      return typeof result.rows[0].data === 'string' 
        ? JSON.parse(result.rows[0].data) 
        : result.rows[0].data;
    }
  } catch (e) {
    console.error('从数据库读取失败，使用默认数据:', e.message);
  }
  return getDefaultData();
}

// 保存数据到数据库
async function saveData(data) {
  try {
    data._lastUpdate = Date.now();
    await pool.query(
      'UPDATE warehouse_data SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [JSON.stringify(data)]
    );
    return true;
  } catch (e) {
    console.error('保存到数据库失败:', e);
    return false;
  }
}

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API: 获取数据
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: '读取数据失败' });
  }
});

// API: 保存数据
app.post('/api/data', async (req, res) => {
  const data = req.body;
  if (data && data.users) {
    const success = await saveData(data);
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

// 启动
async function start() {
  if (process.env.DATABASE_URL) {
    await initDB();
  }
  app.listen(PORT, () => {
    console.log(`阿平仓库管理系统运行在 http://localhost:${PORT}`);
    console.log(`默认账号: admin / 123456`);
    if (!process.env.DATABASE_URL) {
      console.log('警告: 未配置 DATABASE_URL，数据将不会持久化保存');
    }
  });
}

start();
