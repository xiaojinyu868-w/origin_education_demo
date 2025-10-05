# 智慧批改与学情分析平台

端到端解决方案，覆盖试卷上传、智能批改、错题归档、个性化练习生成以及数据分析展示。后端基于 FastAPI/SQLModel，前端使用 Vite + React + Ant Design，界面与交互均为中文，适合直接交付学校进行试点测试。

## 功能亮点
- **任意试卷图片上传**：支持扫描件/手机 拍照，OCR 自动识别题号、作答以及教师批注（✔ ✘ 分值等）。
- **自动批改与错题同步**：客观题即时判分；主观题读取教师批注，错题自动归档至学生错题本。
- **一键生成练习卷**：按知识点筛选错题生成 PDF 个性化练习，支持持续追踪完成状态。
- **教学驾驶舱**：班级整体错题分布、平均分、正确率排行图表化呈现，为精准教学提供数据支撑。
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
    services/            # OCR、自动批改、练习生成、分析等业务模块
    sample_data.py       # 演示数据构建脚本
  requirements.txt       # Python 依赖
frontend/
  package.json           # 前端依赖与脚本
  vite.config.ts         # Vite 配置（反向代理到后端）
  src/
    App.tsx              # 全局布局与导航
    pages/               # 仪表盘、配置、上传、错题、练习、分析页面
    components/          # 批改结果抽屉等复用组件
    styles/              # 自定义全局样式
```

## 快速启动
### 后端
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate         # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload   # 默认监听 127.0.0.1:8000
```

- 首次启动会自动创建 SQLite 数据库 `backend/app.db`。
- 如需演示数据，可调用 `POST http://127.0.0.1:8000/bootstrap/demo`。

### 前端
```bash
cd frontend
npm install
npm run dev                    # 默认访问 http://127.0.0.1:5173
```
Vite 已配置代理，前端访问 `/api/*` 会转发至 FastAPI。

## 核心使用流程
1. **教师配置**：在“教师班级配置”页面录入教师、班级、学生与试卷结构，或调用演示接口快速生成。
2. **试卷上传批改**：在“试卷上传批改”页面选择学生与考试，上传照片即可自动批改，结果以抽屉形式展示。
3. **错题管理**：在“错题与纠错”查看学生错题，勾选知识点可一键生成 PDF 练习卷，并可在“练习任务清单”追踪完成状态。
4. **个性化练习**：在“个性化练习”面板中按学生和时间筛选任务，支持批量标记完成。
5. **学情分析**：在“学情分析”页面查看整体统计与知识点正确率柱状图，辅助教学决策。

## 接口速览
- `POST /bootstrap/demo`：写入示例教师/班级/学生/考试数据。
- `POST /submissions/upload`：上传试卷图片并触发自动批改。
- `GET /students/{id}/mistakes`：获取学生错题列表。
- `POST /practice` / `GET /practice` / `POST /practice/complete`：生成、查询、更新练习任务。
- `POST /analytics`：统计班级知识点正确率、平均分等指标。

## 调优建议
- **OCR 识别**：建议使用 150dpi 以上、光线均匀的扫描件。题号格式如 `1.` `2)` `3:` 均可识别。
- **主观题解析**：教师批注建议使用红色笔迹或明显符号，低置信度项目可在错题本中人工修正。
- **扩展部署**：可将图像处理任务拆分为异步队列（Celery + Redis），并使用对象存储保存原始图片。

## 许可证
当前为校内测试版本，正式上线前请根据校方要求补充隐私与合规条款。
