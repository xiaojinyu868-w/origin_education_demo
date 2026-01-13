# 智慧批改与学情分析平台

端到端解决方案，覆盖试卷上传、智能批改、错题归档、个性化练习生成以及数据分析展示。后端基于 FastAPI/SQLModel，前端使用 Vite + React + Ant Design，界面与交互均为中文，适合直接交付学校进行试点测试。

## v2.0 新特性 (meetmind 对齐升级)

### 多模型 LLM 服务
- **通义千问** (qwen3-vl-plus) - 支持多模态视觉理解
- **Google Gemini** (gemini-3-pro) - 高性能推理
- **OpenAI** (gpt-5.2) - 强大的语言理解能力
- 统一的 LLM Provider 抽象层，支持无缝切换

### AI 家教系统
- 智能对话辅导，帮助解答学习困惑
- 流式响应，实时显示 AI 回复
- 多模态支持，可上传图片进行题目解析
- 引导式问题生成

### 课堂内容处理
- **课堂摘要**：自动生成课堂内容摘要和关键知识点
- **精选片段**：提取课堂精华内容，支持收藏和分享
- 时间线视图，直观展示课堂结构

### JWT 认证体系
- 安全的 Token 认证机制
- 用户角色权限管理 (student/parent/teacher/admin)
- 刷新令牌支持
## 原始需求
教师真实需求总结
🎯 核心目标

利用 AI 技术 提升试卷批改效率，并通过自动化手段为 学生提供个性化错题复习，为 教师提供班级整体学习数据，从而支持更精准的教学决策。

👩‍🎓 学生端需求

不限标准答题卡

支持任何形式的试卷（扫描件/拍照），而不是局限于统一的机读卡。

自动批改

选择题、填空题：由 AI 自动识别并判对/错。

大题（主观题）：教师仍然人工批改，但系统需能识别教师的批改痕迹（勾 ✔、叉 ✘、圈圈、批注等）。

错题自动收集

学生每道题的对错结果自动归档到个人错题库。

不需要学生再手动摘抄错题，减少时间消耗。

个性化错题试卷生成

系统根据错题库自动生成复习试卷。

可定期（如每周）输出个性化练习卷，帮助学生有针对性地巩固弱项。

👩‍🏫 教师端需求

自动化批改支持

省去大部分选择/填空题的批改工作，只需要重点关注大题。

对于大题，AI识别人工批注结果，自动录入错题数据。

班级整体错题分布统计

自动汇总全班学生的错题情况。

以知识点分布图或统计表的形式呈现，直观显示全班在哪些知识点上薄弱。

教学决策支持

根据统计数据，老师可以更有针对性地调整后续教学重点。

比如某一章大部分学生错误率高，就需要在课堂中强化。

🔑 系统关键点

图像识别：不仅识别标准答题卡，还能识别任意试卷上的作答内容和教师批改痕迹。

自动错题归类：结合题号、题型和知识点，建立个人/班级错题库。

个性化试卷生成：自动组合试卷，提升学生复习效率。

数据可视化：教师可视化查看班级错题分布，快速获得教学反馈。
## 功能亮点
- **任意试卷图片上传**：支持扫描件/手机 拍照，OCR 自动识别题号、作答以及教师批注（✔ ✘ 分值等）。
- **自动批改与错题同步**：客观题即时判分；简答题由通义千问生成得分与点评，主观题批注仍可人工录入，错题自动归档至学生错题本。
- **一键生成练习卷**：按知识点筛选错题生成 PDF 个性化练习，支持持续追踪完成状态。
- **教学驾驶舱**：班级整体错题分布、平均分、正确率排行图表化呈现，为精准教学提供数据支撑。
- **AI 批改摘要与流程追踪**：批改完成后呈现大模型生成的点评与完整处理步骤，方便教师快速核查与复盘。
- **定向题目归属管理**：支持为题目打上“全班”或“定向学生”标签，错题针对性推送不扰乱整体评分。
- **AI 教研助手**：教师可直接与大模型互动，秒级生成讲评提纲、作业建议与家校沟通话术。
- **演示数据快速构建**：提供 `/bootstrap/demo` 接口，便于测试完整流程。
##迭代目标
-  **任意试卷图片上传**：采用大模型API实现以代替传统的OCR，提高准确率。
- **自动批改与错题同步**：客观题沿用基于规则的模式，简答题采用大模型API实现，主观题让教师手动批改。



## 项目结构
```
backend/
  app/
    main.py              # FastAPI 路由（中文提示与演示接口）
    models.py            # SQLModel 数据模型
    schemas.py           # Pydantic 数据结构
    services/            # 业务模块
      llm_provider/      # 多模型 LLM 服务层
        base.py          # LLM Provider 抽象基类
        qwen.py          # 通义千问实现
        gemini.py        # Google Gemini 实现
        openai_provider.py # OpenAI 实现
        factory.py       # Provider 工厂
      auth/              # JWT 认证服务
        service.py       # 认证服务实现
        types.py         # 用户角色权限类型
    api/v1/              # API v1 路由
      tutor.py           # AI 家教接口
      chat.py            # 通用对话接口
      summary.py         # 课堂摘要接口
      topics.py          # 精选片段接口
      auth_routes.py     # 认证路由
    sample_data.py       # 演示数据构建脚本
  requirements.txt       # Python 依赖
frontend/
  package.json           # 前端依赖与脚本
  vite.config.ts         # Vite 配置（反向代理到后端）
  src/
    App.tsx              # 全局布局与导航
    api/
      meetmind.ts        # meetmind 对齐的 API 服务
    pages/
      AITutor/           # AI 家教对话页面
      ModelSettings/     # 模型设置页面
      Summary/           # 课堂摘要页面
      Clips/             # 精选片段页面
      Dashboard/         # 仪表盘
      ...                # 其他页面
    components/          # 复用组件
    styles/              # 自定义全局样式
```

## 大模型配置

### 多模型支持 (v2.0)
系统支持多个 LLM 提供商，可根据需求灵活切换：

**通义千问 (推荐)**
- `DASHSCOPE_API_KEY`：必填，用于认证 DashScope 接口
- `QWEN_VL_MODEL`：可选，默认为 `qwen3-vl-plus`
- `QWEN_TEXT_MODEL`：可选，默认为 `qwen-max`
- `QWEN_BASE_URL`：可选，默认指向 `https://dashscope.aliyuncs.com/compatible-mode/v1`

**Google Gemini**
- `GEMINI_API_KEY`：Gemini API 密钥
- `GEMINI_MODEL`：可选，默认为 `gemini-3-pro`

**OpenAI**
- `OPENAI_API_KEY`：OpenAI API 密钥
- `OPENAI_MODEL`：可选，默认为 `gpt-5.2`
- `OPENAI_BASE_URL`：可选，支持自定义端点

**JWT 认证配置**
- `JWT_SECRET`：JWT 签名密钥（生产环境必须修改）
- `ACCESS_TOKEN_EXPIRE_MINUTES`：访问令牌过期时间，默认 120 分钟
- `REFRESH_TOKEN_EXPIRE_DAYS`：刷新令牌过期时间，默认 7 天

未配置密钥时系统会自动回退至 EasyOCR 与手动评分流程。

## 快速启动
### 后端
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate         # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload   # 默认监听 127.0.0.1:8000
```

- 首次启动会自动创建 SQLite 数据库 `backend/app.db`。
- 如需演示数据，可调用 `POST http://127.0.0.1:8000/bootstrap/demo`。

### 前端
```bash
cd frontend
npm install
npx vite                       # 默认访问 http://127.0.0.1:5173
```
Vite 已配置代理，前端访问 `/api/*` 会转发至 FastAPI。

## 核心使用流程
1. **教师配置**：在“教师班级配置”页面录入教师、班级、学生与试卷结构，或调用演示接口快速生成。支持在“试卷结构设计”区为题目设置“全班适用”或“定向学生”标签，满足差异化练习。
2. **试卷上传批改**：在“试卷上传批改”页面选择学生与考试，上传照片即可自动批改，结果以抽屉形式展示。
3. **错题管理**：在“错题与纠错”查看学生错题，勾选知识点可一键生成 PDF 练习卷，并可在“练习任务清单”追踪完成状态。
4. **个性化练习**：在“个性化练习”面板中按学生和时间筛选任务，支持批量标记完成。
5. **学情分析**：在“学情分析”页面查看整体统计与知识点正确率柱状图，辅助教学决策。
6. **AI 教研助手**：在“AI 教研助手”栏目与大模型对话，快速生成讲评提纲、作业建议与家校沟通话术。

## 核心使用流程迭代目标
1. 让逻辑更贴合实际情况，例如试卷绝大多数应该是共用的，只有小部分可能是某个学生独有的错题，所以应该是标签式题目归属标记，默认班级全标，然后可以选择某个学生打标这样。
2. 增加一个栏目，添加一些教师能够直接与大模型进行交互获得信息的小功能小组件，让教师能够直接的享受大模型的交互带来的惊艳感



## 接口速览

### 核心业务接口
- `POST /bootstrap/demo`：写入示例教师/班级/学生/考试数据。
- `POST /bootstrap/clear`：清空数据库数据并删除生成的演示素材。
- `POST /bootstrap/demo/refresh`：重置数据库并重新生成完整演示数据。
- `POST /submissions/upload`：上传试卷图片并触发自动批改。
- `GET /students/{id}/mistakes`：获取学生错题列表。
- `POST /practice` / `GET /practice` / `POST /practice/complete`：生成、查询、更新练习任务。
- `POST /analytics`：统计班级知识点正确率、平均分等指标。

### v2.0 新增接口 (meetmind 对齐)
- `POST /api/v1/tutor`：AI 家教对话（支持流式响应）
- `GET /api/v1/chat`：获取可用模型列表
- `POST /api/v1/chat`：通用 AI 对话
- `POST /api/v1/generate-summary`：生成课堂摘要
- `POST /api/v1/generate-topics`：生成精选片段
- `POST /api/v1/auth/login`：用户登录
- `POST /api/v1/auth/register`：用户注册
- `POST /api/v1/auth/refresh`：刷新 Token
- `GET /api/v1/auth/me`：获取当前用户信息

## 调优建议
- **OCR 识别**：建议使用 150dpi 以上、光线均匀的扫描件。题号格式如 `1.` `2)` `3:` 均可识别。
- **主观题解析**：教师批注建议使用红色笔迹或明显符号，低置信度项目可在错题本中人工修正。
- **扩展部署**：可将图像处理任务拆分为异步队列（Celery + Redis），并使用对象存储保存原始图片。

## 许可证
当前为校内测试版本，正式上线前请根据校方要求补充隐私与合规条款。


## 文档 / Docs
- Upload Center 历史回放 / Upload Center History Playback: `docs/upload-center-history.md`


用户非来不可的理由
教师：
学生

TO DO LIST 
打通错题和智能助手，错题真毒
优化批改体验（流程3，4）
优化显示逻辑
支持PADDLE OCR
实现完整的题目录入
开发错题多邻国应用，探索错题的多种可能的利用方式
