# Cesium Forest Change Monitor

**基于 CesiumJS 的三维森林生物量变化监测 WebGIS**  
*Interactive 3D WebGIS for Forest Biomass Change Monitoring*

本项目基于 **CesiumJS、JavaScript 和 GeoJSON** 构建三维森林变化监测 WebGIS，用于展示加拿大 British Columbia **Mudge Island 与 Link Island** 森林样地在 **2019–2024 年间的地上生物量（Above-Ground Biomass, AGB）变化**。

项目将原有 GIS / Remote Sensing 分析成果转换为 WebGIS 数据，并实现森林样地专题制图、三维地图展示、样地属性查询、动态高亮及中文交互界面。

---

## 1. Project Overview

本项目旨在将森林遥感与 GIS 分析结果进一步开发为可交互的 WebGIS 应用。

主要功能包括：

- CesiumJS 三维地球与地形展示
- Mudge Island 与 Link Island 研究区定位
- GeoJSON 森林样地数据加载
- 2019–2024 年 AGB 变化专题制图
- Forest stand 边界展示
- Study area boundary 展示
- 样地点击查询
- Selected stand 动态高亮
- 中文 Legend 与样地信息面板

---

## 2. Study Area

研究区域位于加拿大 British Columbia 的 **Mudge Island 与 Link Island**。

WebGIS 启动后，相机会自动定位到两岛之间，并以适当高度展示完整研究区域。

研究区域包含多个 forest stands，每个样地具有对应的：

- Stand ID
- Feature ID
- 2019 AGB
- 2024 AGB
- AGB Change

---

## 3. WebGIS Workflow

```text
Forest Inventory / GIS Data
            |
            v
     ArcGIS Pro Processing
            |
            v
      CRS Transformation
     EPSG:3005 -> EPSG:4326
            |
            v
        GeoJSON Export
            |
            +----------------------+
            |                      |
            v                      v
   Forest Stand Polygons      Boundary Layers
            |                      |
            +----------+-----------+
                       |
                       v
                   CesiumJS
                       |
                       v
             AGB Thematic Mapping
                       |
                       v
               Click Interaction
                       |
                       v
          Stand Information Panel
```

---

## 4. Technologies

### Web Development

- **JavaScript**
- **HTML**
- **CSS**
- **Vite**

### WebGIS

- **CesiumJS**
- **Cesium ion**
- **GeoJSON**
- **3D Terrain**
- **Satellite Imagery**

### GIS Data Processing

- **ArcGIS Pro**
- CRS Transformation
- Polygon to Line
- GeoJSON Export
- Spatial attribute processing

---

## 5. Data Structure

当前 WebGIS 使用三组主要 GeoJSON 数据：

```text
public/
└── data/
    ├── forest_stands.geojson
    ├── stand_boundary.geojson
    └── study_area_boundary.geojson
```

### `forest_stands.geojson`

包含森林样地 polygon 以及 AGB 属性：

```text
stand_id
FEATURE_ID
agb_2019
agb_2024
agb_change
```

其中：

```text
agb_change = agb_2024 - agb_2019
```

---

### `stand_boundary.geojson`

用于显示不同 forest stands 之间的内部边界。

该图层由 stand polygons 转换为 polyline 后导出。

---

### `study_area_boundary.geojson`

用于显示 Mudge Island 与 Link Island 研究区域的整体外边界。

---

## 6. AGB Change Visualization

森林样地根据 2019–2024 年 AGB 变化进行专题着色。

当前分类规则为：

| AGB Change | Category | Visualization |
|---:|---|---|
| `> 5 Mg/ha` | 显著增长 | Dark Green |
| `0 – 5 Mg/ha` | 小幅增长 | Light Green |
| `≤ 0 Mg/ha` | 生物量下降 | Red |

WebGIS 在加载 `forest_stands.geojson` 后，根据每个 stand 的：

```text
agb_change
```

自动设置 polygon 样式。

---

## 7. Interactive Stand Query

用户可以点击地图中的任意 forest stand。

系统会自动：

```text
Click Stand
    |
    v
Identify Cesium Entity
    |
    v
Read GeoJSON Properties
    |
    v
Highlight Selected Stand
    |
    v
Display Stand Information
```

右侧信息面板显示：

```text
样地编号
Feature ID
2019 AGB
2024 AGB
AGB Change
变化类型
```

例如：

```text
样地编号: 12

2019 AGB:
233.713 Mg/ha

2024 AGB:
240.247 Mg/ha

AGB Change:
+6.534 Mg/ha

变化类型:
显著增长
```

---

## 8. Selected Stand Highlighting

点击 forest stand 后：

- 当前 polygon 使用黄色半透明填充；
- 创建黄色高亮边界；
- 前一个选中的 stand 自动恢复原始 AGB 分类颜色；
- 点击空白区域可以取消当前高亮。

这一功能用于提升 WebGIS 中的空间交互体验。

---

## 9. User Interface

项目采用中文 WebGIS 界面。

### 左侧面板

主要包括：

```text
森林生物量变化监测平台

Mudge & Link Islands

项目说明

生物量变化图例

显著增长
小幅增长
生物量下降

森林样地边界
研究区边界
```

### 右侧面板

用于动态显示用户选中的 forest stand 属性。

---

## 10. Repository Structure

```text
cesium-forest-change-monitor/
│
├── README.md
├── .gitignore
├── .env.local
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
│
├── public/
│   └── data/
│       ├── forest_stands.geojson
│       ├── stand_boundary.geojson
│       └── study_area_boundary.geojson
│
└── src/
    ├── main.js
    └── style.css
```

> `.env.local` contains the Cesium ion access token and is excluded from Git version control.

---

## 11. Installation

### Requirements

需要安装：

```text
Node.js
npm
```

Clone repository 后进入项目目录：

```bash
npm install
```

主要依赖包括：

```text
cesium
vite
vite-plugin-cesium
```

---

## 12. Cesium ion Token

本项目使用 Cesium ion 服务。

在项目根目录创建：

```text
.env.local
```

并加入：

```env
VITE_CESIUM_ION_TOKEN=YOUR_CESIUM_ION_TOKEN
```

Cesium ion token 不应上传到公开 GitHub repository。

`.gitignore` 中应包含：

```gitignore
*.local
```

或：

```gitignore
.env.local
```

---

## 13. Run the Application

在项目目录运行：

```bash
npm run dev
```

如果 PowerShell Execution Policy 阻止 `npm.ps1`，也可以使用：

```bash
npm.cmd run dev
```

Vite 启动后通常可以通过：

```text
http://localhost:5173/
```

访问 WebGIS。

---

## 14. Key Skills Demonstrated

本项目主要展示以下技术能力：

```text
WebGIS
│
├── CesiumJS
├── 3D GIS
├── GeoJSON
├── Terrain
└── Interactive Mapping


JavaScript
│
├── ES Modules
├── Async Data Loading
├── Functions
├── Event Handling
└── DOM Manipulation


GIS
│
├── CRS Transformation
├── Polygon Processing
├── Polygon-to-Line Conversion
├── Attribute Management
└── Web GIS Data Preparation


Visualization
│
├── Thematic Mapping
├── Dynamic Styling
├── Interactive Query
├── Feature Highlighting
└── Chinese WebGIS UI
```

---

## 15. Current Features

当前版本已实现：

- [x] CesiumJS 3D Viewer
- [x] Cesium ion satellite imagery
- [x] Cesium World Terrain
- [x] Automatic camera positioning
- [x] Forest stand GeoJSON loading
- [x] Stand-level AGB change visualization
- [x] Forest stand boundaries
- [x] Study area boundary
- [x] Chinese legend
- [x] Stand information panel
- [x] Click-based feature query
- [x] Selected stand highlighting

---

## 16. Future Improvements

后续计划继续加入：

- [ ] Land-cover transition thematic layer
- [ ] AGB / Transition visualization mode switch
- [ ] Dynamic legend switching
- [ ] Stable Forest / Regeneration / Disturbance visualization
- [ ] Layer visibility control
- [ ] Reset study-area view
- [ ] Improved responsive UI
- [ ] Online deployment
- [ ] Additional forest structural indicators
- [ ] Integration of raster or 3D forest datasets

计划将现有：

```text
AGB Change WebGIS
```

进一步扩展为：

```text
Forest Biomass
        +
Land Cover Transition
        +
3D WebGIS
        =
Forest Change Monitoring Platform
```

---

## 17. Project Context

本 WebGIS 基于 Mudge Island 与 Link Island 森林变化研究成果进一步开发。

原分析工作主要涉及：

- Multi-temporal satellite imagery
- LiDAR forest metrics
- Land-cover classification
- Land-cover transition
- Above-ground biomass modeling
- Forest stand-level spatial analysis

本项目重点将已有空间分析成果转化为一个可交互的 **CesiumJS WebGIS application**。

---

## 18. Author

**Shangcheng (Brian) Li**

GIS | Remote Sensing | LiDAR | Python | WebGIS

---

## Keywords

`CesiumJS` `JavaScript` `WebGIS` `3D GIS`  
`GeoJSON` `Forest Biomass` `AGB`  
`Remote Sensing` `LiDAR` `Forest Change`  
`GIS Visualization` `Interactive Mapping`