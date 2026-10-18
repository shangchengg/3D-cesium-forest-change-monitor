# Cesium Forest Change Monitor

**基于 CesiumJS 与 GeoSpatial AI Agent 的三维森林变化监测 WebGIS**  
*Interactive 3D WebGIS for Forest Biomass and Land-cover Change Monitoring*

本项目基于 **CesiumJS、JavaScript、Vite 与 GeoJSON**，将加拿大 British Columbia 的 **Mudge Island 和 Link Island** 森林遥感与 GIS 研究成果转化为交互式三维 WebGIS，展示 **2019–2024 年森林样地地上生物量（AGB）变化**与**土地覆盖转换**。

当前版本还接入了独立开发的 **GeoSpatial AI Agent**：通过 **FastAPI + LangGraph + 本地 Qwen/Ollama + RAG + GeoPandas**，支持自然语言检索研究报告、查询森林样地数据，并将返回的样地结果与 Cesium 地图联动高亮。

> **运行状态说明**：Cesium 前端可以独立使用；AI 问答需要另行启动 GeoSpatial AI Agent 后端。当前本地开发接口为 `http://127.0.0.1:8000/chat`。公开部署的前端页面不等于 AI 后端已在线部署。

**WebGIS 前端演示：** https://cesium-forest-change-monitor.vercel.app/  
**AI 后端：** 独立的 `geospatial-ai-agent` 项目（本地开发阶段）。

---

## 1. Project Overview | 项目概览

已实现的主要功能：

- CesiumJS 三维地球、卫星底图、Cesium World Terrain 与研究区自动定位；
- 加载森林样地、样地边界和研究区边界 GeoJSON；
- **AGB Change / Land-cover Transition** 两种可视化模式切换；
- 根据 `agb_change`、`dom_group` 等属性进行动态专题制图和图例切换；
- 点击样地，查看 2019/2024 AGB、变化量、土地覆盖转换组及其比例；
- 手动点击的黄色样地高亮与 AI 查询结果高亮分别管理；
- 中文 AI 聊天界面，支持展示 Markdown 回答、表格和检索信息；
- 通过 FastAPI `/chat` 调用 RAG + GIS Agent，并按 `FEATURE_ID` 自动定位及高亮相关样地；
- 桌面端与移动端响应式布局，手机端 AI 面板支持折叠。

---

## 2. Study Area & Research Context | 研究区域

研究区位于加拿大不列颠哥伦比亚省南部 Gulf Islands 的 **Mudge Island 与 Link Island**，共包含 **13 个森林样地（forest stands）**。

WebGIS 展示的数据源于多时相卫星影像、LiDAR、Vegetation Resource Inventory（VRI）等研究数据的处理结果。原研究围绕 2019–2024 年的森林覆盖变化、AGB 变化及二者关系展开。本仓库侧重 **WebGIS 可视化、前端交互与 AI 集成**，不等同于包含全部遥感分析原始数据与处理流程的完整研究仓库。

---

## 3. System Architecture | 系统架构

```text
                      User / Browser
                            |
                            v
              CesiumJS WebGIS (Vite)
              |                 |
              |                 +--> GeoJSON layers
              |                      AGB / Transition maps
              |
              +--> AI Chat Panel (fetch /chat)
                            |
                            v
                  FastAPI (local backend)
                            |
                            v
                LangGraph + Qwen (Ollama)
                      /             \
                     v               v
              RAG Search Tool     GIS Query Tools
              Chroma + PDF        GeoPandas + GeoJSON/GPKG
                     \               /
                      v             v
                 Structured JSON response
               answer / sources / feature_ids
                            |
                            v
               Match Cesium FEATURE_ID
               --> Highlight related stands
```

**前端与后端是两个独立项目。** Cesium 前端可以正常显示 GIS 数据而无需运行 AI 服务；自然语言分析功能则依赖后端运行及 API 可访问。

---

## 4. Technologies | 技术栈

| 模块 | 技术 |
|---|---|
| Frontend | JavaScript, HTML, CSS, Vite |
| 3D WebGIS | CesiumJS, Cesium ion, Cesium World Terrain |
| Spatial data | GeoJSON, GIS attribute processing, CRS transformation |
| AI response display | marked, DOMPurify |
| AI backend（独立项目） | Python, FastAPI, LangGraph, LangChain, Ollama, Qwen |
| Knowledge retrieval | Chroma, PDF-based RAG, embeddings |
| GIS tools | GeoPandas, GeoJSON, GeoPackage |
| 原始 GIS 数据处理 | ArcGIS Pro |

---

## 5. Data Structure | 前端数据

```text
public/
└── data/
    ├── forest_stands.geojson
    ├── stand_boundary.geojson
    └── study_area_boundary.geojson
```

### `forest_stands.geojson`

核心属性包括：

| 字段 | 含义 |
|---|---|
| `stand_id` | 前端展示的样地编号 |
| `FEATURE_ID` | 前后端联动使用的稳定标识符 |
| `agb_2019` | 2019 年 AGB |
| `agb_2024` | 2024 年 AGB |
| `agb_change` | AGB 变化（`agb_2024 - agb_2019`） |
| `dom_group` | 主导土地覆盖转换组 |
| `dom_prop` | 主导转换组所占比例，取值 0–1 |

AGB 在前端样地信息面板中以 **Mg/ha** 显示。`stand_boundary.geojson` 绘制样地边界，`study_area_boundary.geojson` 绘制研究区外边界。

**数据对齐：** 前端 `forest_stands.geojson` 与后端 `biomass.geojson` 均有 13 个样地，并已验证 `FEATURE_ID` 无重复、集合一致。尽管两份数据的属性与 CRS 不同，仍可通过 `FEATURE_ID` 对接，无需互相覆盖。

---

## 6. Visualization Modes | 双模式专题可视化

### AGB Change（生物量变化）

| 条件 | 类型 | 颜色 |
|---|---|---|
| `agb_change > 5` | 显著增长 | 深绿色 |
| `0 < agb_change <= 5` | 小幅增长 | 浅绿色 |
| `agb_change <= 0` | 生物量下降 / 非正变化 | 红色 |

> 当前前端代码将 `agb_change == 0` 也归入红色类别；这是可视化实现的现状，不代表零变化在生态学上属于生物量损失。

### Land-cover Transition（土地覆盖转换）

根据 `dom_group` 分类展示：

| `dom_group` | 显示类别 | 颜色 |
|---|---|---|
| `Stable_forest` | 持续森林覆盖 | 绿色 |
| `Regeneration` | 森林恢复 | 青绿色 |
| `Disturbance` | 森林扰动 | 橙色 |
| 其他 | 其他类型 | 灰色 |

用户可在中文界面中切换两种模式，地图颜色和图例同步更新。

---

## 7. Interactive Stand Query | 样地交互

点击森林多边形可：

1. 获取对应 Cesium Entity 和 GeoJSON 属性；
2. 用黄色半透明填充及黄色边界显示手动选中状态；
3. 在信息面板展示 `stand_id`、`FEATURE_ID`、2019/2024 AGB、AGB Change、`dom_group` 与 `dom_prop`；
4. 恢复前一个选中样地的专题颜色，点击空白区域取消当前选择。

AI 自动匹配的样地由独立的高亮 Entity 显示，不覆盖已有 AGB / Transition 基础着色逻辑。

---

## 8. GeoSpatial AI Integration | AI 智能分析

AI 功能依赖另一个本地项目 **GeoSpatial AI Agent**。后端已实现：

- PDF 研究报告的语义检索（RAG）；
- 基于 GeoPandas 的森林样地属性筛选与统计；
- LangGraph Agent 根据问题选择 RAG 或 GIS 工具；
- 多工具协同回答，例如“哪些 Stand 的 AGB 下降了？结合报告解释可能原因”；
- FastAPI `POST /chat` 返回结构化结果。

### API Request

```http
POST http://127.0.0.1:8000/chat
Content-Type: application/json
```

```json
{
  "question": "哪些 Stand 的 AGB 下降了？"
}
```

### API Response（结构示例）

```json
{
  "answer": "共找到 2 个 AGB 下降的样地……",
  "stand_ids": [35790310, 46639286],
  "feature_ids": [15482873, 15483050],
  "sources": [],
  "tool_calls": ["get_biomass_loss"]
}
```

前端使用 `feature_ids`，通过 `entity.properties.FEATURE_ID` 匹配 Cesium Entity，绘制 AI 结果高亮并移动镜头。`stand_ids` 是后端的 `POLYGON_ID`，**不要直接与前端 `stand_id` 混用**。

AI 回答通过 Markdown 渲染，并使用 DOMPurify 清理生成的 HTML。模型解释属于辅助分析；对于具体扰动原因，应结合报告证据与现场信息核实。

---

## 9. User Interface & Responsive Design | 界面设计

- **左侧：** 项目说明、AGB / Transition 模式按钮、专题图例；
- **右侧：** 点击森林样地后的属性面板；
- **桌面端底部居中：** 地理空间 AI 助手聊天面板；
- **移动端右下角：** 可展开/收起的 AI 面板，并与样地信息面板协调显示；
- **地图高亮：** 黄色用于手动点击，橙黄色用于 AI 匹配结果（当前本地实现）。

界面为中文；AI 可根据问题语言生成回答。不同设备的实际布局仍会持续优化。

---

## 10. Repository Structure | 仓库结构

```text
cesium-forest-change-monitor/
├── README.md
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── public/
│   └── data/
│       ├── forest_stands.geojson
│       ├── stand_boundary.geojson
│       └── study_area_boundary.geojson
└── src/
    ├── main.js
    └── style.css
```

本地配置文件 `.env.local` 不应提交到 Git。AI 后端的 Python、RAG、GeoPandas 和 LangGraph 代码**不在此仓库**。

---

## 11. Installation & Local Development | 本地运行

### Requirements

- Node.js 与 npm；
- Cesium ion access token；
- 可选：单独运行的 GeoSpatial AI Agent / FastAPI 后端（仅 AI 功能需要）。

```bash
git clone <YOUR_REPOSITORY_URL>
cd cesium-forest-change-monitor
npm install
```

请将 `<YOUR_REPOSITORY_URL>` 替换为仓库的真实克隆地址。

在项目根目录创建 `.env.local`：

```env
VITE_CESIUM_ION_TOKEN=YOUR_CESIUM_ION_TOKEN
VITE_AGENT_API_URL=http://127.0.0.1:8000
```

其中 `VITE_AGENT_API_URL` 可选；当前前端开发代码默认使用 `http://127.0.0.1:8000`。`VITE_*` 配置会被打包到浏览器代码中，因此**不能存放服务器端秘密凭证**。Cesium ion token 应按 Cesium 官方建议限制权限与使用范围。

启动前端：

```bash
npm run dev
```

如果 Windows PowerShell 阻止执行 `npm.ps1`，可以运行：

```powershell
npm.cmd run dev
```

打开 Vite 在 Terminal 中显示的地址（通常为 `http://localhost:5173/`）。

### 启动 AI Backend（可选）

在**另一个项目** `geospatial-ai-agent` 的 Python 虚拟环境中启动：

```bash
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

可通过 `http://127.0.0.1:8000/docs` 测试 `/chat`。本地开发时，FastAPI 的 CORS 设置需要允许前端实际使用的端口（例如 `http://localhost:5173`）。

> **重要：** `127.0.0.1` 指向**访问者自己的设备**，不是 Vercel 服务器。因此公开 WebGIS 页面在没有额外可访问后端的情况下，无法向其他用户提供本地 AI 问答服务。当前版本的 AI 集成主要用于本地联调和功能演示。

---

## 12. Current Development Status | 当前开发状态

- [x] Cesium 3D Viewer、卫星影像与地形
- [x] 自动定位 Mudge / Link Islands
- [x] 13 个森林 Stand 及边界 GeoJSON 展示
- [x] AGB Change 专题图
- [x] Land-cover Transition 专题图
- [x] AGB / Transition 模式切换与动态图例
- [x] 样地点击查询、中文信息面板与黄色高亮
- [x] 中文 AI Chat Panel 与 Markdown 展示
- [x] 本地 FastAPI `/chat` 联调
- [x] LangGraph + RAG + GIS 多工具调用
- [x] `FEATURE_ID` 跨项目匹配及 AI 样地高亮
- [x] 基础响应式界面、手机端 AI 折叠
- [x] Cesium 前端部署至 Vercel
- [ ] 公网可访问的 AI 后端部署
- [ ] Docker 容器化及部署说明
- [ ] 多轮会话与聊天历史
- [ ] Raster Tool 与更多空间分析能力
- [ ] 完整 RAG / Agent Benchmark 与性能优化

---

## 13. Future Improvements | 后续计划

- 为 AI 后端加入身份认证、请求限制及可部署配置；
- 完成 Docker 化，研究公网推理服务和前端 API 配置；
- 增加 Rasterio 栅格查询及更多 Stand 统计工具；
- 支持多轮问答、聊天记录、点击 AI 结果定位样地；
- 优化移动端面板布局、地图高亮与交互反馈；
- 扩充 RAG Benchmark，评估检索命中率、引用准确性与响应时间。

---

## 14. Skills Demonstrated | 技术能力

**Cesium / GIS**：3D WebGIS、GeoJSON 图层、动态专题制图、Entity 属性查询、要素高亮、坐标系与属性映射。  
**Frontend**：JavaScript ES Modules、Vite、异步请求、DOM 操作、中文 UI、响应式布局、Markdown 安全渲染。  
**AI Integration**：FastAPI 对接、LangGraph Tool Calling、RAG + GIS 查询结果整合、结构化 JSON、自然语言驱动地图联动。  
**Spatial Research**：森林遥感、LiDAR 指标、AGB 模型、土地覆盖变化分析。

---

## 15. Author

**Shangcheng (Brian) Li**  
GIS · Remote Sensing · LiDAR · Python · WebGIS · GeoSpatial AI

**Keywords:** `CesiumJS` `WebGIS` `3D GIS` `GeoJSON` `Forest Biomass` `AGB` `Land-cover Transition` `Remote Sensing` `LiDAR` `FastAPI` `LangGraph` `RAG` `GIS Tool Calling`
