# Vercel 部署速查（seo-tool）

> 当前代码状态：6 大 SEO 模块 + 账户系统（登录/注册/后台/额度）全部可用。
> 数据库已迁移至 **Turso**（SQLite 云版），账户数据在 Vercel 上可正常读写。

## 前置条件
- GitHub 仓库已推送：`https://github.com/huangboming91/seo-tool`
- 有 GitHub 账号（用于授权 Vercel）
- 本机 `.env.local` 里的密钥不会上传（已被 `.gitignore` 忽略），需手动在 Vercel 填一遍

## 步骤

### 1. 登录 Vercel
打开 https://vercel.com → 点 **Continue with GitHub**，授权登录。

### 2. 导入仓库
- Dashboard 右上角 **Add New → Project**
- 在 *Import Git Repository* 找到 `huangboming91 / seo-tool` → 点 **Import**

### 3. 确认配置（基本自动，无需手改）
- **Framework Preset**：Next.js（自动识别）
- **Root Directory**：`./`（默认就是仓库根，**不要改**）
- **Node.js Version**：选 `20.x`（Project Settings → General 可改）
- Build Command / Output 保持默认

### 4. 填环境变量（展开 Environment Variables）
| 变量名 | 值 | 是否必填 |
|--------|-----|----------|
| `JWT_SECRET` | 长随机串，如 `openssl rand -base64 32` 生成的 | **必填** |
| `TURSO_URL` | Turso 数据库地址，形如 `libsql://seo-tool-xxx.turso.io` | **必填（账户系统）** |
| `TURSO_AUTH_TOKEN` | Turso 数据库令牌，形如 `eyJ...` | **必填（账户系统）** |
| `DATAFORSEO_LOGIN` | 你的 DataForSEO 邮箱 | 建议填 |
| `DATAFORSEO_PASSWORD` | 你的 DataForSEO 密码 | 建议填 |
| `TAVILY_API_KEY` | `tvly-...` | 可选 |
| `DATA_SOURCE` | `dataforseo` | 可选 |

> 生成 JWT_SECRET 的命令（在本机 Git Bash / 终端跑）：`openssl rand -base64 32`
> 把输出的一长串复制填到 `JWT_SECRET` 的值里。
> `TURSO_URL` 与 `TURSO_AUTH_TOKEN` 在 Turso 控制台创建数据库后获取（见下「Turso 凭证」）。

### 5. Deploy
- 点 **Deploy**，等待 1–2 分钟 build
- 完成后得到域名：`https://seo-tool-xxx.vercel.app`

## 后续
- 绑定自定义域名：Project → Settings → Domains
- 每次 `git push` 后会自动重新部署（无需再来控制台点）
- 改环境变量：Project → Settings → Environment Variables

## ⚠️ 重要提示（当前代码）
- 数据库已迁移至 **Turso**（`@libsql/client`），账户系统（登录/注册/后台/额度）在 Vercel 上可正常读写，无需降级。
- 部署后**首次访问**会自动在 Turso 云库建表并写入 Admin 种子账号
  （`admin@seotool.com` / `Admin@2026`），可直接登录。
- 6 大 SEO 模块页面能正常打开（搜索查询因 DataForSEO 返回 403 仍会失败，需先去 DataForSEO 后台修凭证/充值）。
- 若你删除了 Turso 数据库，重新部署并访问一次即可自动重建。

## 🗄️ Turso 凭证获取（数据库迁移用）
1. 打开 https://turso.tech → 用 GitHub 登录。
2. **Create Database** → Name 填 `seo-tool` → Region 选最近的（如 `aws-us-west-2` 或 `ap-southeast`）。
3. 复制 **Database URL**：`libsql://seo-tool-xxxx.turso.io` → 填到 `TURSO_URL`。
4. 切到 **Tokens** → **Generate new token** → 复制 `eyJ...` → 填到 `TURSO_AUTH_TOKEN`
   （Token 只显示一次，关掉页面就看不到，请立即保存）。
