# SEO Platform

一个基于 Next.js 14 的全功能 SEO 分析平台，集成关键词研究、排名追踪、域名概览、外链分析、品牌可见度（LLM 提及）与站点审计六大模块，并内置多账户权限与配额管理。

> © 2026 MingWong

---

## ✨ 功能特性

- **关键词研究（Keyword Research）**：输入主题或落地页，自动提取主关键词 / 长尾词 / 问题词，并聚类成主题簇；附带 **SERP 分析**（自然搜索结果排名、标题、URL）与 **流量趋势图**（12 个月搜索量走势）。
- **排名追踪（Rank Tracking）**：监控目标关键词在搜索引擎中的排名变化。
- **域名概览（Domain Overview）**：查看域名的流量估算、关键词覆盖与竞争态势。
- **外链分析（Backlinks）**：分析入站外链数量、来源域名与锚文本分布。
- **品牌可见度（Brand Lookup）**：检测品牌在 ChatGPT、Google AI Overview 等大模型中的提及情况。
- **站点审计（Site Audits）**：抓取页面并给出技术 SEO 健康检查与优化建议。
- **账户与权限系统**：
  - Admin 主账户可管理子账户、分配功能模块与每日额度。
  - 子账户默认每日 10 次操作配额。
  - 四维权限模型：模块访问权 / 操作权限（导出、批量）/ 加权额度 / 数据可见范围。
  - 审计日志：记录所有账户的关键操作。
- **历史记录**：各模块自动保存本地历史，便于对比复盘。

---

## 🛠 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Next.js 14（App Router, JavaScript） |
| 前端 | React 18, 内置 CSS 变量主题 |
| 鉴权 | JWT（jsonwebtoken）+ HttpOnly Cookie + jose（Edge 中间件） |
| 密码 | bcryptjs |
| 数据库 | Turso（`@libsql/client`，SQLite 云版，支持 Vercel 无状态环境） |
| 部署 | Vercel Serverless |
| 数据源 | DataForSEO / Tavily（通过环境变量切换） |

---

## 📦 安装

要求 Node.js 18+。

```bash
# 克隆仓库
git clone <your-repo-url>
cd seo-tool

# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
# 然后编辑 .env.local 填入你的 API 凭证

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

---

## ⚙️ 环境变量

复制 `.env.local.example` 为 `.env.local` 并填写：

| 变量 | 说明 |
|------|------|
| `DATAFORSEO_LOGIN` | DataForSEO 账号邮箱 |
| `DATAFORSEO_PASSWORD` | DataForSEO API 密码 |
| `TAVILY_API_KEY` | Tavily API Key（可选，备用搜索源） |
| `DATA_SOURCE` | 数据源：`dataforseo` 或 `tavily` |
| `JWT_SECRET` | JWT 签名密钥（请使用足够随机的长字符串） |
| `TURSO_URL` | Turso 数据库地址（形如 `libsql://xxx.turso.io`），账户系统必填 |
| `TURSO_AUTH_TOKEN` | Turso 数据库令牌（形如 `eyJ...`），账户系统必填 |

> ⚠️ `.env.local` 含有密钥，**已被 `.gitignore` 忽略，不会被提交到仓库**。请勿将真实凭证提交到 Git。

---

## 🚀 使用

1. 首次访问注册一个账户，或直接用 Admin 账户登录（默认 `admin@seotool.com` / `Admin@2026`，请尽快修改密码）。
2. 未登录可浏览界面；执行查询、导出等操作需先注册 / 登录。
3. 进入各模块输入目标关键词 / 域名即可获取分析结果。

---

## 👥 账户与权限系统

权限由四个维度控制：

| 维度 | 说明 |
|------|------|
| 模块访问权 | 账户可访问哪些功能模块 |
| 操作权限 | 是否允许导出（can_export）、批量操作（can_batch） |
| 加权额度 | 不同模块消耗不同权重（关键词=1、排名=1、域名=2、品牌=2、外链=3、审计=5） |
| 数据可见范围 | self / group / all |

匿名用户每天有有限次数（通过 IP 限流），登录用户按账户配额扣减，Admin 无限额度。

---

## 📁 项目结构（核心目录）

```
src/
├── app/                  # Next.js 路由与页面
│   ├── page.js          # 关键词研究（首页）
│   ├── login/           # 登录
│   ├── register/        # 注册
│   ├── admin/           # 管理后台（仅 Admin 可见）
│   ├── api/             # 各模块 API 路由
│   └── ...
├── components/          # 复用组件（ResultsPanel、SerpAnalysisPanel 等）
├── lib/                 # 数据库、鉴权、配额逻辑
└── middleware.js        # 路由守卫（保护 /admin）
```

---

## ☁️ 部署到 Vercel

1. 在 Vercel 导入该仓库。
2. 在 Vercel 项目设置中配置上述环境变量（**`JWT_SECRET`、`TURSO_URL`、`TURSO_AUTH_TOKEN` 必填**）。
3. 部署完成后访问分配的域名即可；首次访问会自动在 Turso 建表并写入 Admin 种子账号。
4. 用默认 Admin 账号登录：`admin@seotool.com` / `Admin@2026`（请尽快修改密码）。

> 数据库使用 Turso（SQLite 云版，`@libsql/client`），天然适配 Vercel 的无状态只读环境，无需降级或额外改造。

---

## 🔖 版本管理

本项目采用 [语义化版本](https://semver.org/lang/zh-CN/)（SemVer）。每个正式版本打一个 Git Tag 并发布 GitHub Release：

```bash
# 打标签（例如 v1.0.0）
git tag -a v1.0.0 -m "v1.0.0: 初始发布 - 六大 SEO 模块 + 账户权限系统"
git push origin v1.0.0
```

随后在 GitHub 仓库的 **Releases → Draft a new release** 中选择该 Tag，填写更新说明并发布。

---

## 📄 许可证

本项目仅供学习与内部使用。如需商用请自行确认相关数据源的授权与合规要求。
