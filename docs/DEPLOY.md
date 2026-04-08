# PageLM 部署指南

## 当前部署信息

**服务器**: 38.14.254.51

**已部署服务**:
- 前端: http://38.14.254.51:5173
- 后端: http://38.14.254.51:5000

## 环境要求

- Docker >= 20.10
- Docker Compose >= 1.25（支持 version "3.3"）
- Node.js >= 21.18（本地开发）

## 快速部署

### 1. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# Server
HOST=0.0.0.0
PORT=5000
VITE_BACKEND_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_TIMEOUT=90000

# Database
db_mode=json

# LLM 配置 - DeepSeek (推荐)
LLM_PROVIDER=openai
EMB_PROVIDER=gemini
LLM_TEMP=1
LLM_MAXTOK=8192

# DeepSeek API
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_MODEL=deepseek-chat
OPENAI_BASE_URL=https://api.deepseek.com/v1
```

### 2. 启动服务

```bash
# 构建并启动所有服务
sudo docker-compose up -d --build

# 查看服务状态
sudo docker-compose ps

# 查看日志
sudo docker-compose logs -f
```

### 3. 验证部署

```bash
# 验证后端运行
curl http://localhost:5000/health

# 验证前端运行
curl http://localhost:5173
```

## Docker Compose 配置说明

本项目使用 `network_mode: host` 让后端可直接访问宿主机端口（如 SSH 隧道）：

```yaml
services:
  backend:
    network_mode: host
    volumes:
      - /var/www/workspace/PageLM/storage:/app/storage
      - /var/www/workspace/PageLM/.env:/app/.env:ro
  frontend:
    ports:
      - "5173:5173"
```

## 端口配置

- **Frontend**: 5173
- **Backend**: 5000

## 故障排查

### 后端启动失败

```bash
# 查看后端日志
sudo docker logs pagelm-backend

# 常见问题：
# 1. 缺少 API 密钥 - 检查 .env 中的 LLM_PROVIDER 和对应密钥
# 2. 端口冲突 - 检查 5000 端口是否被占用
```

### 前端构建失败

```bash
# 重新构建前端
sudo docker-compose build --no-cache frontend
```

### 数据库问题

服务使用 JSON 文件存储（db_mode=json），数据保存在 `storage/` 目录。

## 模型自动切换

后端内置模型自动切换机制，当遇到限流错误时会自动切换到备用模型：

```typescript
// 支持的模型（按优先级）
const SUPPORTED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]
```

触发条件：`429` / `rate limit` / `quota` / `额度` / `TOO_MANY_REQUESTS`

## 环境变量参考

详见 `.env.example` 文件，主要包括：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端端口 | 5000 |
| `VITE_BACKEND_URL` | 前端连接的后端地址 | http://localhost:5000 |
| `LLM_PROVIDER` | LLM 提供商 | gemini |
| `db_mode` | 数据库模式 | json |
| `TTS_PROVIDER` | TTS 提供商 | edge |

## 测试

### 运行测试

```bash
# 后端测试 (1219个测试全部通过)
cd /var/www/workspace/PageLM/backend && npx vitest run

# 前端测试 (需在Docker环境中)
sudo docker-compose exec frontend npm test
```

### 测试结果 (2026-04-08)

| 测试套件 | 通过 | 失败 | 总计 | 通过率 |
|----------|------|------|------|--------|
| 后端单元测试 | 826 | 0 | 826 | 100% |
| 后端集成测试 | 393 | 0 | 393 | 100% |
| **总计** | **1219** | **0** | **1219** | **100%** |

### 修复的问题

1. **WebSocket Mock 修复** - 添加 `addEventListener` 方法和 `socket.remoteAddress`
2. **Rate Limiter 重置** - 为测试添加 `connectionLimiter.reset()` 
3. **UUID 格式验证** - 测试使用符合规范的十六进制 UUID
4. **内存泄漏修复** - planner.ts SIGINT 处理器、notifications 数组限制
5. **前端测试覆盖** - 新增 Chat 组件和 Hooks 测试文件