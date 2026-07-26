# 商素智作 - 电商商品素材生成与反馈优化助手

面向抖音电商商家的商品素材生成与反馈优化助手。基于商品信息生成带货脚本、商品图/封面 Brief、短视频分镜，并通过反馈数据驱动下一次生成。

## 核心功能

- **商品信息输入**：支持商品上新/老品重推/素材优化三种场景，支持商品图片和竞品截图上传
- **竞品图片 OCR**：调用 GLM-5V-Turbo 自动识别竞品截图内容
- **AI Prompt Chain**：8 步 AI 处理链（商品结构化 → 卖点排序 → 角度生成 → 脚本/图Brief/分镜 → 风险检查 → 历史依据）
- **按类型生成**：可单独生成带货脚本、商品图Brief 或短视频分镜
- **3 组内容包输出**：每组包含所选类型内容、风险提示和推荐理由
- **内容编辑与反馈**：支持在线编辑、采用/修改/弃用标记，编辑内容持久化
- **单模块重新生成**：可对单个方案的某类素材重新生成并预览确认
- **AI 生图**：基于 Brief 描述调用 CogView-4 生成商品图
- **表现数据录入**：手动录入曝光、点击、CTR、转化，支持数据表现评价
- **历史商品引用**：老品重推/素材优化场景从历史商品选择，AI 参考历史反馈生成

## 技术栈

- **框架**：Next.js 15 (App Router)
- **UI**：Shadcn/UI + Tailwind CSS（暖色调主题）
- **AI（内容生成）**：AI SDK v3 + @ai-sdk/openai，模型：DeepSeek V4 Pro
- **AI（图片识别）**：智谱 GLM-5V-Turbo（竞品截图 OCR）
- **AI（图片生成）**：智谱 CogView-4（商品图生成）
- **数据库**：SQLite（better-sqlite3 + Drizzle ORM）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key（复制 .env.local.example 并填入）
cp .env.local.example .env.local
# 编辑 .env.local：
# DEEPSEEK_API_KEY=sk-xxxx        # DeepSeek API Key
# GLM_API_KEY=xxxx                # 智谱 GLM API Key（用于 OCR 和生图）

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可使用。

## 项目结构

```
app/
├── api/                    # API Routes
│   ├── tasks/              # 任务 CRUD、AI 生成（SSE）、反馈、表现数据
│   ├── generate-image/     # CogView-4 商品图生成
│   ├── ocr-competitor/     # GLM-5V-Turbo 竞品识别
│   └── upload/             # 图片上传
├── tasks/
│   ├── new/                # 新建任务
│   └── [taskId]/
│       ├── analysis/       # 商品分析报告
│       ├── select/         # 选择内容类型
│       ├── edit/           # 修改商品信息
│       ├── data-feedback/  # 表现数据录入
│       └── page.tsx        # 内容展示与反馈
└── page.tsx                # 首页（最近任务）
lib/
├── ai/
│   ├── chain.ts            # Prompt Chain 编排器
│   ├── provider.ts         # DeepSeek provider
│   ├── schemas.ts          # Zod 输出 Schema
│   └── prompts/            # P1-P8 八个 Prompt
└── db/
    ├── schema.ts           # 7 张表定义
    └── index.ts            # Drizzle 客户端
components/
├── content-package-card.tsx  # 内容包卡片（含编辑/反馈/重新生成）
└── inline-feedback.tsx       # 内联反馈组件
```

## 业务链路 (L1-L8)

```
L1 触发（新建任务）
L2 输入（商品信息 + 图片 + 竞品）
L3 预处理（P1 结构化 + P2 卖点排序）
L4 核心生成（P3 角度 + P4 脚本 + P5 图Brief + P6 分镜）
L5 输出（3 组内容包展示）
L6 反馈（采用/修改/弃用 + 数据录入）
L7 沉淀（SQLite 持久化）
L8 历史调用（P7 风险检查 + P8 历史依据，驱动下次生成）
```

## 数据库表

| 表 | 说明 |
|---|---|
| tasks | 任务记录（类型、状态、生成类型） |
| products | 商品原始信息 |
| productProfiles | 商品结构化画像 |
| contentVersions | 内容版本（脚本/Brief/分镜/风险/推荐理由） |
| feedback | 用户反馈（采用/修改/弃用 + 模块分类） |
| performance | 表现数据（曝光/点击/CTR/转化） |
| triggers | 主动触发记录 |
