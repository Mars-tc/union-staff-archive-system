# 工会职工档案系统

工会职工档案系统是一款面向工会组织的无纸化办公平台，旨在解决传统纸质入会申请、会费授权管理、困难职工帮扶及爱心互助等业务流程效率低下、难以管理的问题。系统涵盖工会会员管理、困难帮扶申请审批、爱心互助会管理、爱心帮扶等核心业务，支持两级审核流程（基层审核 → 委员会审核），提供电子签名、批量导入、统计分析等实用功能。

## 功能特性

### 1. 工会会员管理
- 在线填写入会申请表（部门、职位、身份证号、政治面貌等）
- 集成电子签名组件（支持鼠标和触屏签名）
- 两级审核流程：基层工会审核 → 委员会审核
- 批量审核支持
- 申请标签管理
- 避免重复申请：已通过或审核中不允许重复提交

### 2. 会费授权管理
- 在线授权会费从工资中统一扣划
- 填写授权生效日期
- 电子签名确认授权记录
- 两级审核流程管理
- 仅工会会员可申请

### 3. 困难帮扶申请与审批
- **只有工会会员才能申请困难帮扶**
- **只有通过审批的申请才会生成困难职工档案**
- 困难类别：伤残致困、意外致困、因病致困、子女助学、特殊困难
- 病种管理：重疾、慢病、其他三类
- 同一病种仅能申请一次（重复校验，前后端双重校验）
- 两级审批流程：基层工会审核 → 委员会审核
- 支持上传证明材料（诊断证明、困难证明等）
- 一键导入困难帮扶记录到爱心帮扶
- 同步申请：困难帮扶申请时可同步创建爱心帮扶申请

### 4. 爱心互助会管理
- 在线填写爱心互助会入会申请表
- 工作小组意见和签名
- 办公室意见和签名
- 审核状态管理

### 5. 爱心帮扶申请与审批
- **只有爱心互助会会员才能申请爱心帮扶**
- 申请内容与困难帮扶相同（病种、金额、家庭收入等）
- 既是工会会员也是爱心互助会会员的用户可申请两次帮扶
- 同一病种仅能申请一次
- 支持从困难帮扶一键导入
- 两级审批流程
- 批量审核、标记已核

### 6. 查询与统计
- 按姓名、病种、申请时间等条件检索
- 病种类别分布统计
- 月度帮扶金额统计
- 爱心帮扶统计数据
- 统计报表查看

### 7. 系统管理
- 用户管理（角色分配、会员类型设置）
- 批量用户创建与更新
- 模块权限管理（细粒度权限控制）
- 系统操作日志
- 审核任务统计（待办/已办）
- 困难档案批量导入（Excel）

## 技术栈

- **前端**: React 18 + TypeScript + TailwindCSS 3
- **后端**: Express 4 + TypeScript (ESM模块)
- **数据库**: PostgreSQL >= 14
- **状态管理**: Zustand
- **路由**: React Router DOM
- **认证**: JWT + bcryptjs
- **图表**: Chart.js + react-chartjs-2
- **图标**: Lucide React
- **构建工具**: Vite 6
- **文件上传**: Multer
- **Excel处理**: xlsx 0.18.5

## 项目结构

```
union-staff-archive-system/
├── .trae/documents/          # PRD和技术架构文档
├── api/                      # 后端代码
│   ├── config/               # 数据库连接和JWT配置
│   │   ├── database.ts       # PostgreSQL连接池配置
│   │   ├── jwt.ts            # JWT生成与验证
│   │   └── middleware/auth.ts # 认证中间件
│   ├── routes/               # API路由
│   │   ├── auth.ts           # 认证相关接口
│   │   ├── membership.ts     # 入会申请接口
│   │   ├── fee.ts            # 会费授权接口
│   │   ├── difficulty.ts     # 困难帮扶接口
│   │   ├── mutualAid.ts      # 爱心互助会接口
│   │   ├── mutualAidDifficulty.ts # 爱心帮扶接口
│   │   ├── users.ts          # 用户管理接口
│   │   ├── modules.ts        # 模块权限接口
│   │   ├── tasks.ts          # 审核任务接口
│   │   └── logs.ts           # 系统日志接口
│   ├── database/             # 数据库脚本
│   │   ├── init.sql          # 数据库初始化脚本
│   │   └── reset.sql         # 数据库重置脚本
│   ├── models/               # 数据模型
│   ├── uploads/              # 上传文件存储
│   ├── app.ts                # Express应用配置
│   ├── index.ts              # 应用入口
│   └── server.ts             # 服务器启动
├── src/                      # 前端代码
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx        # 主布局组件
│   │   ├── LoginForm.tsx     # 登录表单
│   │   ├── SignaturePad.tsx  # 电子签名组件
│   │   ├── DataTable.tsx     # 数据表格组件
│   │   └── ...               # 其他通用组件
│   ├── pages/                # 页面组件
│   │   ├── Login.tsx         # 登录页
│   │   ├── Register.tsx      # 注册页
│   │   ├── Home.tsx          # 首页仪表盘
│   │   ├── Profile.tsx       # 个人资料页
│   │   ├── MembershipApply.tsx   # 入会申请页
│   │   ├── MembershipAudit.tsx    # 入会审核页
│   │   ├── FeeAuthorization.tsx  # 会费授权页
│   │   ├── FeeAudit.tsx          # 会费审核页
│   │   ├── DifficultyApply.tsx   # 困难帮扶申请页
│   │   ├── DifficultyAudit.tsx   # 困难帮扶审批页
│   │   ├── DifficultyRecords.tsx # 困难档案页
│   │   ├── MutualAidApply.tsx    # 爱心互助会申请页
│   │   ├── MutualAidAudit.tsx    # 爱心互助会审核页
│   │   ├── MutualAidDifficultyApply.tsx # 爱心帮扶申请页
│   │   ├── MutualAidDifficultyAudit.tsx # 爱心帮扶审批页
│   │   ├── UserManagement.tsx    # 用户管理页
│   │   ├── Tasks.tsx             # 审核任务页
│   │   ├── Statistics.tsx        # 统计报表页
│   │   ├── Logs.tsx              # 系统日志页
│   │   └── ForgotPassword.tsx    # 忘记密码页
│   ├── store/auth.ts         # 认证状态管理
│   ├── lib/api.ts            # API封装
│   ├── context/              # React Context
│   ├── hooks/                # 自定义Hooks
│   └── App.tsx               # 应用入口
├── public/                   # 静态资源
├── .env                      # 环境变量配置
├── package.json              # 项目配置
└── vite.config.ts            # Vite配置
```

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 9

### 安装步骤

#### 1. 克隆项目

```bash
git clone <repository-url>
cd union-staff-archive-system
```

#### 2. 安装依赖

```bash
pnpm install
```

#### 3. 配置环境变量

编辑 `.env` 文件：

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=union_staff
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

#### 4. 数据库初始化

创建数据库（必须使用 UTF-8 编码）：

```bash
# Linux/macOS
createdb -U postgres union_staff

# Windows PowerShell
psql -U postgres -c "CREATE DATABASE union_staff ENCODING 'UTF8';"
```

**执行初始化脚本**（创建表结构、初始数据）：

```bash
# Linux/macOS
PGCLIENTENCODING=UTF8 psql -U postgres -d union_staff -f api/database/init.sql
```

```powershell
# Windows PowerShell
Set-Item -Path env:PGCLIENTENCODING -Value UTF8
psql -U postgres -d union_staff -f api/database/init.sql
```

> ⚠️ **重要**: Windows 环境下必须设置 `PGCLIENTENCODING=UTF8`，否则会出现中文字符转换错误。

**重置数据库**（清空数据重新初始化）：

```bash
PGCLIENTENCODING=UTF8 psql -U postgres -d union_staff -f api/database/reset.sql
```

```powershell
# Windows PowerShell
Set-Item -Path env:PGCLIENTENCODING -Value UTF8
psql -U postgres -d union_staff -f api/database/reset.sql
```

#### 5. 启动开发服务器

```bash
pnpm run dev
```

前端访问: http://localhost:5173
后端API: http://localhost:3001

#### 6. 生产构建

```bash
pnpm run build
```

构建产物位于 `dist/` 目录。

## 默认账户

| 角色 | 邮箱 | 密码 | 说明 |
|------|------|------|------|
| 系统管理员 | admin@union.com | password | 所有权限，包括用户管理、日志、统计 |
| 基层审核人 | grass_root@union.com | password | 第一级审核权限 |
| 委员会审核人 | committee@union.com | password | 第二级审核权限 |
| 普通职工 | employee@union.com | password | 申请入会、帮扶等 |

> ⚠️ 生产环境请务必修改默认密码。

## API 接口文档

所有 API 均以 `/api` 为前缀，需要认证的接口需在请求头中携带 `Authorization: Bearer <token>`。

### 认证接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户信息 | 是 |
| PUT | `/api/auth/me` | 更新个人资料 | 是 |
| PUT | `/api/auth/me/password` | 修改密码 | 是 |
| POST | `/api/auth/forgot-password` | 发送密码重置验证码 | 否 |
| POST | `/api/auth/reset-password` | 重置密码 | 否 |

**登录请求体**:
```json
{
  "account": "email/phone/id_card",
  "password": "password"
}
```
支持通过邮箱、手机号或身份证号登录。

### 入会申请接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/membership/apply` | 提交入会申请 | 是 |
| GET | `/api/membership/applications` | 获取申请列表（支持 status, mine, marked_as_audited 筛选） | 是 |
| GET | `/api/membership/applications/:id` | 获取申请详情 | 是 |
| PUT | `/api/membership/applications/:id` | 审核申请 | 是 |
| PUT | `/api/membership/applications/batch` | 批量审核申请 | 是 |
| PUT | `/api/membership/applications/:id/tags` | 更新申请标签 | 是 |
| PUT | `/api/membership/applications/:id/mark-as-audited` | 标记为已核 | 是 |
| PUT | `/api/membership/applications/batch/mark-as-audited` | 批量标记为已核 | 是 |

**审核权限规则**:
- 基层审核人: 只能填写基层审核意见，不能填写委员会审核意见
- 委员会审核人: 只能填写委员会审核意见，不能修改基层审核意见
- 管理员: 拥有完全审核权限

### 会费授权接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/fee/authorize` | 提交会费授权（仅工会会员） | 是 |
| GET | `/api/fee/authorizations` | 获取授权列表 | 是 |
| GET | `/api/fee/authorizations/:id` | 获取授权详情 | 是 |
| PUT | `/api/fee/authorizations/:id` | 审核授权（管理员） | 是(管理员) |

### 困难帮扶接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/difficulty/apply` | 提交困难帮扶申请（仅工会会员） | 是 |
| POST | `/api/difficulty/upload-document/:id` | 上传证明材料 | 是 |
| GET | `/api/difficulty/check-duplicate` | 检查重复申请 | 是 |
| GET | `/api/difficulty/disease-types` | 获取病种列表 | 是 |
| GET | `/api/difficulty/categories` | 获取困难类别列表 | 是 |
| GET | `/api/difficulty/applications` | 获取申请列表（支持 status, disease_type_id, difficulty_category, audit_step 筛选） | 是 |
| GET | `/api/difficulty/applications/:id` | 获取申请详情 | 是 |
| GET | `/api/difficulty/user-applications` | 获取当前用户的所有申请记录 | 是 |
| GET | `/api/difficulty/records` | 获取困难职工档案（仅管理员和审核人） | 是 |
| PUT | `/api/difficulty/applications/:id` | 审核申请 | 是 |
| PUT | `/api/difficulty/applications/:id/mark-as-audited` | 标记为已核 | 是 |
| PUT | `/api/difficulty/applications/batch/mark-as-audited` | 批量标记为已核 | 是 |
| GET | `/api/difficulty/stats` | 获取统计数据（管理员） | 是(管理员) |
| POST | `/api/difficulty/import/preview` | 预览批量导入 | 是(管理员) |
| POST | `/api/difficulty/import` | 执行批量导入 | 是(管理员) |

**申请请求体**:
```json
{
  "difficulty_category": "disease",      // 困难类别
  "disease_type_id": 1,                   // 病种ID（因病致困必填）
  "amount": 5000,                         // 帮扶金额
  "reason": "病情描述...",                 // 申请原因
  "signature": "base64_signature",        // 电子签名
  "family_income": 12000,                  // 家庭年收入
  "family_members": "3人",                 // 家庭成员
  "bank_account": "6222...",               // 银行账号
  "bank_name": "工商银行",                 // 开户行
  "bank_account_name": "张三",             // 账户名
  "create_mutual_aid": false              // 是否同步创建爱心帮扶申请
}
```

**困难类别枚举**:
| 值 | 标签 |
|----|------|
| disability | 伤残致困 |
| accident | 意外致困 |
| disease | 因病致困 |
| education | 子女助学 |
| special | 特殊困难 |

### 爱心互助会接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/mutual-aid/apply` | 提交爱心互助会申请 | 是 |
| GET | `/api/mutual-aid/applications` | 获取申请列表 | 是 |
| GET | `/api/mutual-aid/applications/:id` | 获取申请详情 | 是 |
| PUT | `/api/mutual-aid/applications/:id` | 审核申请（管理员） | 是(管理员) |
| PUT | `/api/mutual-aid/applications/:id/mark-as-audited` | 标记为已核 | 是 |
| PUT | `/api/mutual-aid/applications/batch/mark-as-audited` | 批量标记为已核 | 是 |

### 爱心帮扶接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/mutual-aid-difficulty/apply` | 提交爱心帮扶申请（仅爱心互助会会员） | 是 |
| POST | `/api/mutual-aid-difficulty/upload-document/:id` | 上传证明材料 | 是 |
| GET | `/api/mutual-aid-difficulty/check-duplicate` | 检查重复申请 | 是 |
| GET | `/api/mutual-aid-difficulty/disease-types` | 获取病种列表 | 是 |
| GET | `/api/mutual-aid-difficulty/categories` | 获取困难类别列表 | 是 |
| GET | `/api/mutual-aid-difficulty/applications` | 获取申请列表 | 是 |
| GET | `/api/mutual-aid-difficulty/applications/:id` | 获取申请详情 | 是 |
| PUT | `/api/mutual-aid-difficulty/applications/:id` | 审核申请 | 是 |
| PUT | `/api/mutual-aid-difficulty/applications/:id/mark-as-audited` | 标记为已核 | 是 |
| PUT | `/api/mutual-aid-difficulty/applications/batch/mark-as-audited` | 批量标记为已核 | 是 |
| GET | `/api/mutual-aid-difficulty/stats` | 获取统计数据（管理员） | 是(管理员) |

### 用户管理接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/users` | 获取用户列表（支持 search, role, union_member, mutual_aid_member, is_retired 筛选） | 是(管理员) |
| POST | `/api/users` | 创建用户 | 是(管理员) |
| POST | `/api/users/batch` | 批量创建用户 | 是(管理员) |
| PUT | `/api/users/:id` | 更新用户信息 | 是(管理员) |
| PUT | `/api/users/batch` | 批量更新用户（支持 role, union_member, mutual_aid_member, is_retired） | 是(管理员) |
| DELETE | `/api/users/:id` | 删除用户（不能删除管理员） | 是(管理员) |
| DELETE | `/api/users/batch` | 批量删除用户 | 是(管理员) |

### 模块权限接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/modules` | 获取所有模块列表 | 是 |
| GET | `/api/modules/user/:userId` | 获取用户的模块权限 | 是 |
| PUT | `/api/modules/user/:userId` | 更新用户的模块权限 | 是(管理员) |
| PUT | `/api/modules/user/batch` | 批量更新用户权限 | 是(管理员) |

**系统模块**:
| 代码 | 名称 | 描述 |
|------|------|------|
| tasks | 任务管理 | 查看审核任务统计 |
| membership_audit | 入会审核 | 审核入会申请 |
| fee_audit | 会费审核 | 审核会费授权 |
| mutual_aid_audit | 互助会审核 | 审核爱心互助会申请 |
| mutual_aid_difficulty_audit | 爱心帮扶审批 | 审核爱心帮扶申请 |
| user_management | 用户管理 | 管理系统用户 |
| system_logs | 系统日志 | 查看系统操作日志 |
| statistics | 查询统计 | 查看各类统计报表 |

### 审核任务接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/tasks/todo` | 获取待办任务列表 | 是(审核人/管理员) |
| GET | `/api/tasks/done` | 获取已办任务列表 | 是(审核人/管理员) |
| GET | `/api/tasks/stats` | 获取任务统计数据 | 是(审核人/管理员) |

### 系统日志接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/logs` | 获取日志列表（分页，支持 action, userId, startDate, endDate 筛选） | 是(管理员) |
| GET | `/api/logs/:id` | 获取日志详情 | 是(管理员) |
| DELETE | `/api/logs/:id` | 删除单条日志 | 是(管理员) |
| DELETE | `/api/logs/batch` | 批量删除日志 | 是(管理员) |

## 业务规则

### 用户角色

系统支持四种角色：

| 角色 | 代码 | 说明 |
|------|------|------|
| 普通职工 | employee | 申请入会、授权会费、申请困难帮扶、申请爱心互助会 |
| 基层审核人 | grass_root_auditor | 审核入会/会费/困难帮扶/爱心帮扶申请（第一级） |
| 委员会审核人 | union_committee_auditor | 审核入会/会费/困难帮扶/爱心帮扶申请（第二级） |
| 管理员 | admin | 所有权限，包括用户管理、系统日志、批量导入等 |

### 会员类型

用户可同时拥有两种会员身份：

| 类型 | 字段 | 说明 |
|------|------|------|
| 工会会员 | union_member | 可申请困难帮扶、会费授权 |
| 爱心互助会会员 | mutual_aid_member | 可申请爱心帮扶 |

### 审核流程

所有审核流程均采用两级审核机制：

```
提交申请 → 待基层审核 → 基层审核通过 → 待委员会审核 → 委员会审核通过 → 已通过
                                                              ↘ 拒绝 → 已拒绝（终止流程）
           ↘ 基层审核拒绝 → 已拒绝（终止流程）
```

**审核状态流转**:
- `pending` → `grass_root` → `union_committee` → `completed`
- 任意一级拒绝直接变为 `completed`（status 为 `rejected`）

### 困难帮扶业务规则

1. **仅工会会员可申请**: 非工会会员无法提交困难帮扶申请
2. **病种重复限制**: 同一病种仅能申请一次（无论之前申请状态为通过、拒绝或审核中）
3. **双重校验**: 前端实时检查 + 后端数据库校验，确保数据完整性
4. **同步创建爱心帮扶**: 既是工会会员又是爱心互助会会员的用户，可在提交困难帮扶时同步创建爱心帮扶申请
5. **导入功能**: 爱心帮扶申请支持从历史困难帮扶记录一键导入

### 爱心帮扶业务规则

1. **仅爱心互助会会员可申请**: 非会员无法提交
2. **病种重复限制**: 与困难帮扶相同规则
3. **与困难帮扶独立**: 两种帮扶申请互不影响，可分别申请

### 批量导入规则（困难档案）

1. 仅管理员可执行
2. 支持 Excel 文件导入
3. 导入前预览匹配结果
4. 未匹配用户可选择自动创建（角色为普通职工 + 工会会员）
5. 事务性操作：批量使用 SAVEPOINT 保证数据一致性
6. 自动创建用户后导出账号信息 Excel

## 开发指南

### 代码规范

- 使用 TypeScript 进行类型检查
- 组件文件使用 `.tsx` 扩展名
- 后端代码使用 ESM 模块格式 (`import`/`export`)
- 后端路径引用使用 `fileURLToPath(import.meta.url)` 兼容 ESM
- 遵循 React Hooks 规则
- 中文命名组件和变量的注释

### 可用命令

```bash
pnpm run dev           # 启动前后端开发服务器
pnpm run client:dev    # 仅启动前端开发服务器
pnpm run server:dev    # 仅启动后端开发服务器
pnpm run build         # 生产构建（类型检查 + Vite 构建）
pnpm run check         # TypeScript 类型检查
pnpm run lint          # ESLint 代码检查
pnpm run preview       # 预览生产构建
```

### 数据库脚本

| 文件 | 说明 |
|------|------|
| `api/database/init.sql` | 初始化所有表结构、初始数据、默认用户 |
| `api/database/reset.sql` | 重置数据库（清空所有数据重新初始化） |
| `api/database/migrations/add_marked_as_audited.sql` | 迁移脚本：添加 marked_as_audited 字段 |
| `api/database/add_mutual_aid_difficulty.sql` | 迁移脚本：创建爱心帮扶申请表 |

### 前端页面路由

| 路径 | 页面 | 权限 |
|------|------|------|
| `/login` | 登录页 | 公开 |
| `/register` | 注册页 | 公开 |
| `/forgot-password` | 忘记密码 | 公开 |
| `/home` | 首页仪表盘 | 已登录 |
| `/profile` | 个人资料 | 已登录 |
| `/membership/apply` | 入会申请 | 已登录 |
| `/membership/audit` | 入会审核 | 审核人/管理员 |
| `/fee/authorization` | 会费授权 | 工会会员 |
| `/fee/audit` | 会费审核 | 管理员 |
| `/difficulty/apply` | 困难帮扶申请 | 工会会员 |
| `/difficulty/audit` | 困难帮扶审批 | 审核人/管理员 |
| `/difficulty/records` | 困难档案 | 已登录 |
| `/mutual-aid/apply` | 爱心互助会申请 | 已登录 |
| `/mutual-aid/audit` | 爱心互助会审核 | 管理员 |
| `/mutual-aid-difficulty/apply` | 爱心帮扶申请 | 爱心互助会会员 |
| `/mutual-aid-difficulty/audit` | 爱心帮扶审批 | 审核人/管理员 |
| `/users` | 用户管理 | 管理员 |
| `/tasks` | 审核任务 | 审核人/管理员 |
| `/statistics` | 统计报表 | 管理员 |
| `/logs` | 系统日志 | 管理员 |

## 常见问题

### Q: 启动开发服务器时 PostgreSQL 连接失败？
确保 PostgreSQL 服务正在运行，且 `.env` 中的数据库配置正确。默认配置为 `localhost:5432`。

### Q: Windows 环境执行 SQL 脚本报字符错误？
必须设置 UTF-8 编码：
```powershell
Set-Item -Path env:PGCLIENTENCODING -Value UTF8
```

### Q: 忘记密码功能如何使用？
1. 访问忘记密码页面，输入邮箱
2. 开发模式下验证码会直接返回在响应中的 `dev_code` 字段（生产环境应配置邮件服务）
3. 输入验证码和新密码完成重置

### Q: 如何批量导入困难档案？
1. 管理员进入困难档案页面，点击"批量导入"
2. 上传 Excel 文件（需包含：姓名、员工编码/身份证号、所属单位、联系电话）
3. 预览匹配结果，确认是否创建新用户
4. 执行导入，系统生成账号信息 Excel

### Q: 同步申请爱心帮扶如何使用？
在困难帮扶申请页面，如果用户同时是工会会员和爱心互助会会员，会显示"同步申请爱心帮扶"勾选框。勾选后提交将同时创建两条申请记录。

## 许可证

MIT License
