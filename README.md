# NewsBoard

RSS 新闻资讯聚合平台，支持可配置数据源、按领域分类展示、AI 助手发现 RSS 源。

**技术栈**：FastAPI + SQLite（后端） | React + TypeScript + Tailwind CSS（前端）

---

## 部署

### Docker Compose（推荐）

```bash
# 构建前端
cd frontend && npm install && npm run build && cd ..

# 启动服务
docker compose up -d --build
```

启动后访问 `http://localhost`，数据持久化在 `./data/` 目录。

管理命令：

```bash
docker compose logs -f backend    # 查看日志
docker compose down               # 停止服务
docker compose up -d --build      # 重新构建并启动
```

### 手动启动

**后端：**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**前端：**

```bash
cd frontend
npm install
npm run dev
```

启动后：
- 前端：http://localhost:5173
- API 文档：http://localhost:8000/docs

---

## 功能

| 页面 | 路径 | 说明 |
|------|------|------|
| 新闻资讯 | `/` | 浏览所有新闻，按分类/数据源筛选，中英文切换 |
| 数据源管理 | `/sources` | 添加/编辑/删除 RSS 数据源，手动拉取 |
| 分类管理 | `/categories` | 创建/编辑/删除领域分类 |
| AI 助手 | 设置面板 | 多轮对话发现 RSS 源，一键添加 |
| 大模型配置 | `/llm` | 配置 OpenAI 兼容大模型，测试连接 |
| 代理配置 | `/proxy` | 配置 HTTP/SOCKS5 代理，测试连通性 |

### 配置流程

1. 在「分类管理」创建分类（如：科技、财经、AI）
2. 在「数据源管理」添加 RSS 源，选择分类，设置语言和拉取间隔
3. 英文数据源可开启「启用翻译」，自动翻译为中文
4. 或使用「AI 助手」通过对话自动发现和添加 RSS 源

### 环境变量

```env
DATABASE_URL=sqlite+aiosqlite:///./data/newsboard.db
CORS_ORIGINS=["http://localhost"]
```

---

## 项目结构

```
newsboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/              # SQLAlchemy 模型
│   │   ├── routers/             # API 路由
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   └── services/            # 业务逻辑（RSS拉取、翻译、AI助手、调度）
│   ├── alembic/                 # 数据库迁移
│   ├── Dockerfile               # 后端容器
│   └── entrypoint.sh            # 启动脚本（自动迁移 + uvicorn）
├── frontend/
│   ├── src/
│   │   ├── views/               # 页面组件
│   │   ├── components/          # UI 组件
│   │   ├── api/                 # API 客户端
│   │   └── router/              # 路由配置
│   └── vite.config.ts
├── nginx.conf                   # Nginx 反代配置
├── docker-compose.yml           # 容器编排
└── data/                        # SQLite 数据（Docker volume）
```
