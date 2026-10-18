import {
  Cartesian3,
  Color,
  GeoJsonDataSource,
  Ion,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Terrain,
  Viewer,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Load Cesium ion access token
const cesiumToken =
  import.meta.env.VITE_CESIUM_ION_TOKEN;

console.log(
  "Cesium token loaded:",
  Boolean(cesiumToken),
  "length:",
  cesiumToken?.length ?? 0
);

Ion.defaultAccessToken =
  cesiumToken;

// Create Cesium Viewer
const viewer = new Viewer(
  "cesiumContainer",
  {
    terrain: Terrain.fromWorldTerrain(),

    infoBox: false,
    selectionIndicator: false,

  }
);


// Fly to the study area between Mudge and Link Islands

const isMobile =
  window.innerWidth <= 768;

viewer.camera.flyTo({
  destination: Cartesian3.fromDegrees(
    isMobile ? -123.7860 : -123.7950,
    isMobile ? 49.1190 : 49.1239,
    isMobile ? 7000 : 6000
  ),
  duration: 3,
});


// Load forest stand polygons
const forestStands = await GeoJsonDataSource.load(
  "/data/forest_stands.geojson",
  {
    clampToGround: true,
  }
);
// Add GeoJSON to the viewer
viewer.dataSources.add(forestStands);

// Visualization mode
let visualizationMode = "agb";
// Highlight settings
let selectedStand = null;
let highlightLine = null;

// Return AGB change color
function getAgbColor(entity) {

  const agbChange =
    Number(
      entity.properties.agb_change.getValue(
        viewer.clock.currentTime
      )
    );

  if (agbChange > 5) {
    return Color.DARKGREEN.withAlpha(0.55);
  }

  if (agbChange > 0) {
    return Color.LIMEGREEN.withAlpha(0.55);
  }

  return Color.RED.withAlpha(0.65);
}


// Return land-cover transition color
function getTransitionColor(entity) {

  const rawGroup =
    entity.properties.dom_group
      ?.getValue(
        viewer.clock.currentTime
      );

  const transitionGroup =
    String(rawGroup ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  if (transitionGroup === "stable_forest") {
    return Color
      .fromCssColorString("#2E8B57")
      .withAlpha(0.60);
  }

  if (transitionGroup === "regeneration") {
    return Color
      .fromCssColorString("#20B2AA")
      .withAlpha(0.60);
  }

  if (transitionGroup === "disturbance") {
    return Color
      .fromCssColorString("#F28E2B")
      .withAlpha(0.65);
  }

  return Color
    .fromCssColorString("#808080")
    .withAlpha(0.55);
}


// Return color based on current visualization mode
function getCurrentStandColor(entity) {

  if (visualizationMode === "transition") {
    return getTransitionColor(entity);
  }

  return getAgbColor(entity);
}

// Polygon styling
const standEntities = forestStands.entities.values;

for (const entity of standEntities) {
  if (!entity.polygon || !entity.properties) {
    continue;
  }

  entity.polygon.material =
  getCurrentStandColor(entity);
}

// Update stand colors
function updateStandStyles() {

  for (const entity of standEntities) {

    if (
      !entity.polygon ||
      !entity.properties
    ) {
      continue;
    }

    entity.polygon.material =
      getCurrentStandColor(entity);
  }


  if (selectedStand) {

    selectedStand.polygon.material =
      Color.YELLOW.withAlpha(0.50);

  }
}

// Visualization mode controls

const agbModeButton =
  document.getElementById(
    "agbModeButton"
  );

const transitionModeButton =
  document.getElementById(
    "transitionModeButton"
  );

const agbLegend =
  document.getElementById(
    "agbLegend"
  );

const transitionLegend =
  document.getElementById(
    "transitionLegend"
  );

const legendTitle =
  document.getElementById(
    "legendTitle"
  );


// Switch to AGB mode
agbModeButton.addEventListener(
  "click",
  () => {

    visualizationMode = "agb";

    agbModeButton
      .classList.add(
        "active"
      );

    transitionModeButton
      .classList.remove(
        "active"
      );

    agbLegend
      .classList.remove(
        "hidden"
      );

    transitionLegend
      .classList.add(
        "hidden"
      );

    legendTitle.textContent =
      "生物量变化图例";

    updateStandStyles();
  }
);


// Switch to transition mode
transitionModeButton.addEventListener(
  "click",
  () => {

    visualizationMode =
      "transition";

    transitionModeButton
      .classList.add(
        "active"
      );

    agbModeButton
      .classList.remove(
        "active"
      );

    transitionLegend
      .classList.remove(
        "hidden"
      );

    agbLegend
      .classList.add(
        "hidden"
      );

    legendTitle.textContent =
      "土地覆盖变化图例";

    updateStandStyles();
  }
);

// Load stand boundaries
const standBoundary = await GeoJsonDataSource.load(
  "/data/stand_boundary.geojson",
  {
    clampToGround: true,
    stroke: Color.BLACK,
    strokeWidth: 3,
  }
);

viewer.dataSources.add(standBoundary);

// Load study area boundary
const studyAreaBoundary = await GeoJsonDataSource.load(
  "/data/study_area_boundary.geojson",
  {
    clampToGround: true,
    stroke: Color.CYAN,
    strokeWidth: 5,
  }
);

viewer.dataSources.add(studyAreaBoundary);

// Mobile panel state
function updateMobilePanelState(
  standSelected
) {

  const legendPanel =
    document.getElementById(
      "legendPanel"
    );

  const standInfoPanel =
    document.getElementById(
      "standInfoPanel"
    );


  if (standSelected) {

    legendPanel
      ?.classList.add(
        "mobile-hidden"
      );

    standInfoPanel
      ?.classList.add(
        "mobile-active"
      );

  }

  else {

    legendPanel
      ?.classList.remove(
        "mobile-hidden"
      );

    standInfoPanel
      ?.classList.remove(
        "mobile-active"
      );

  }
}


// Stand click interaction

const clickHandler = new ScreenSpaceEventHandler(
  viewer.scene.canvas
);


// Left click event

clickHandler.setInputAction(

  function (movement) {

    // Pick object from the clicked position

    const pickedObject = viewer.scene.pick(
      movement.position
    );


    // Clear highlight when clicking empty area

    if (
      !pickedObject ||
      !pickedObject.id
    ) {

      if (selectedStand) {

        selectedStand.polygon.material =
          getCurrentStandColor(
            selectedStand
          );
        
        selectedStand = null;
      }


      if (highlightLine) {

        viewer.entities.remove(
          highlightLine
        );

        highlightLine = null;
      }

      updateMobilePanelState(false);

      return;
    }


    // Get selected entity

    const entity = pickedObject.id;


    // Only process forest stand polygons

    if (
      !forestStands.entities.contains(entity)
    ) {
      return;
    }


    if (
      !entity.polygon ||
      !entity.properties
    ) {
      return;
    }


    // Restore previous stand color

    if (
      selectedStand &&
      selectedStand !== entity
    ) {

      selectedStand.polygon.material =
        getCurrentStandColor(
          selectedStand
        );
    }


    // Remove previous highlight boundary

    if (highlightLine) {

      viewer.entities.remove(
        highlightLine
      );

      highlightLine = null;
    }


    // Highlight selected stand

    selectedStand = entity;

    entity.polygon.material =
      Color.YELLOW.withAlpha(0.50);


    // Get polygon geometry

    const time =
      viewer.clock.currentTime;

    const hierarchy =
      entity.polygon.hierarchy.getValue(
        time
      );


    // Create highlight boundary

    if (
      hierarchy &&
      hierarchy.positions
    ) {

      const positions = [
        ...hierarchy.positions,
        hierarchy.positions[0]
      ];


      highlightLine =
        viewer.entities.add({

          polyline: {

            positions: positions,

            width: 5,

            material: Color.YELLOW,

            clampToGround: true,
          },

        });
    }


    // Read stand attributes

    const properties =
      entity.properties;


    const standId =
      properties.stand_id
        .getValue(time);


    const featureId =
      properties.FEATURE_ID
        ?.getValue(time);


    const agb2019 =
      Number(
        properties.agb_2019
          .getValue(time)
      );


    const agb2024 =
      Number(
        properties.agb_2024
          .getValue(time)
      );


    const agbChange =
      Number(
        properties.agb_change
          .getValue(time)
      );

    const transitionGroupRaw =
      properties.dom_group
        ?.getValue(time);

    const transitionProp =
      Number(
        properties.dom_prop
          ?.getValue(time)
      );

    let transitionGroupDisplay;


switch (
  String(
    transitionGroupRaw ?? ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
) {

  case "stable_forest":

    transitionGroupDisplay =
      "持续森林覆盖";

    break;


  case "regeneration":

    transitionGroupDisplay =
      "森林恢复";

    break;


  case "disturbance":

    transitionGroupDisplay =
      "森林扰动";

    break;


  case "other":

    transitionGroupDisplay =
      "其他稳定覆盖";

    break;


  default:

    transitionGroupDisplay =
      transitionGroupRaw ?? "-";
}

    // Classify biomass change

    let changeClass;


    if (agbChange > 5) {

      changeClass =
        "显著增长";

    }

    else if (agbChange > 0) {

      changeClass =
        "小幅增长";

    }

    else {

      changeClass =
        "生物量下降";

    }


    // Update stand information panel
    
    document
      .getElementById(
        "transitionGroup"
      )
      .textContent =
      transitionGroupDisplay;


    document
      .getElementById(
        "transitionProp"
      )
      .textContent =
      Number.isFinite(
        transitionProp
      )
        ? `${(
            transitionProp * 100
          ).toFixed(1)}%`
        : "-";

    document
      .getElementById("standId")
      .textContent =
      standId;


    document
      .getElementById("featureId")
      .textContent =
      featureId ?? "-";


    document
      .getElementById("agb2019")
      .textContent =
      `${agb2019.toFixed(3)} Mg/ha`;


    document
      .getElementById("agb2024")
      .textContent =
      `${agb2024.toFixed(3)} Mg/ha`;


    document
      .getElementById("agbChange")
      .textContent =
      `${agbChange >= 0 ? "+" : ""}${agbChange.toFixed(3)} Mg/ha`;


    document
      .getElementById("changeClass")
      .textContent =
      changeClass;


    // Show stand details

    document
      .getElementById("infoHint")
      .style.display =
      "none";


    document
      .getElementById("standDetails")
      .classList.remove(
        "hidden"
      );
      
    updateMobilePanelState(true);
  },

  ScreenSpaceEventType.LEFT_CLICK

);


/* =========================================
   GeoSpatial AI Agent Integration
   ========================================= */

// Local FastAPI backend
const AI_API_URL =
  import.meta.env.VITE_AGENT_API_URL ||
  "http://127.0.0.1:8000";

// Store AI highlight entities separately
let aiHighlightEntities = [];

// Build lookup: FEATURE_ID -> Cesium Entity
const featureEntityMap = new Map();

for (const entity of standEntities) {
  const id = entity.properties?.FEATURE_ID?.getValue(
    viewer.clock.currentTime
  );

  if (id !== undefined && id !== null) {
    featureEntityMap.set(String(id), entity);
  }
}

console.log(
  "AI: indexed forest stands:",
  featureEntityMap.size
);


// Clear previous AI highlights
function clearAIHighlights() {
  for (const entity of aiHighlightEntities) {
    viewer.entities.remove(entity);
  }

  aiHighlightEntities = [];
}


// Highlight stands returned by FastAPI

async function highlightAIStands(featureIds) {
  clearAIHighlights();

  const matched = [];
  const missing = [];

  for (const id of featureIds) {
    const entity = featureEntityMap.get(String(id));

    if (!entity?.polygon) {
      missing.push(id);
      continue;
    }

    const hierarchy = entity.polygon.hierarchy?.getValue(
      viewer.clock.currentTime
    );

    if (!hierarchy?.positions?.length) {
      missing.push(id);
      continue;
    }

    // Highlight polygon with orange-yellow fill
    const highlightPolygon = viewer.entities.add({
      name: `AI 匹配样地 ${id}`,
      polygon: {
        hierarchy: hierarchy,
        material: Color.fromCssColorString(
          "#FFB000"
        ).withAlpha(0.60),
      },
    });

    aiHighlightEntities.push(highlightPolygon);

    const positions = [
      ...hierarchy.positions,
      hierarchy.positions[0],
    ];

    // Dark outline for contrast
    const darkOutline = viewer.entities.add({
      polyline: {
        positions,
        width: 10,
        material: Color.BLACK,
        clampToGround: true,
      },
    });

    // Bright outline
    const brightOutline = viewer.entities.add({
      polyline: {
        positions,
        width: 6,
        material: Color.fromCssColorString("#FFD600"),
        clampToGround: true,
      },
    });

    aiHighlightEntities.push(darkOutline, brightOutline);
    matched.push(entity);
  }

  if (matched.length > 0) {
    await viewer.flyTo(matched, {
      duration: 1.8,
    });
  }

  return {
    matched: matched.length,
    missing,
  };
}



// Create AI chat interface
const aiPanel = document.createElement("section");
aiPanel.id = "aiChatPanel";


aiPanel.innerHTML = `
  <div class="ai-chat-header">
    <div class="ai-chat-title">
      <strong>地理空间 AI 助手</strong>
      <small>森林生物量 · 土地覆盖变化</small>
    </div>

    <button
      id="aiToggleButton"
      type="button"
      aria-label="展开或收起 AI 助手"
      aria-expanded="true"
    >−</button>
  </div>

  <div id="aiChatBody">
    <div id="aiAnswer" role="status" aria-live="polite">
      你好！你可以向我询问森林生物量变化、
      土地覆盖转换或研究报告中的内容。
    </div>

    <form id="aiChatForm">
      <textarea
        id="aiQuestion"
        rows="2"
        placeholder="例如：哪些样地的生物量下降了？"
        aria-label="输入 AI 问题"
        required
      ></textarea>

      <div class="ai-chat-actions">
        <button type="submit" id="aiAskButton">
          发送问题
        </button>

        <button type="button" id="aiClearButton">
          清除结果
        </button>
      </div>
    </form>
  </div>
`;


document.body.appendChild(aiPanel);


// UI references
const aiForm = document.getElementById("aiChatForm");
const aiQuestion = document.getElementById("aiQuestion");
const aiAnswer = document.getElementById("aiAnswer");
const aiAskButton = document.getElementById("aiAskButton");
const aiClearButton = document.getElementById("aiClearButton");
const aiToggleButton = document.getElementById("aiToggleButton");
const aiChatBody = document.getElementById("aiChatBody");


// Submit question to FastAPI
aiForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = aiQuestion.value.trim();
  if (!question) return;

  aiAskButton.disabled = true;
  aiAskButton.textContent = "正在分析...";
  aiAnswer.textContent = "正在检索研究资料并分析空间数据，请稍候...";

  try {
    const response = await fetch(`${AI_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`API HTTP ${response.status}`);
    }

    const data = await response.json();

  function renderAIAnswer(markdown) {
    const html = marked.parse(markdown, {
      gfm: true,
      breaks: true,
    });

    aiAnswer.innerHTML = DOMPurify.sanitize(html);
  }

    // Display model answer as plain text.
    // Avoid injecting LLM-generated HTML.
    renderAIAnswer(
      typeof data.answer === "string"
        ? data.answer
        : "模型未返回回答。"
    );

    const ids = Array.isArray(data.feature_ids)
      ? data.feature_ids
      : [];

    const highlightResult = await highlightAIStands(ids);

    const statusMessages = [];

    if (ids.length > 0) {
      statusMessages.push(
        `地图：已高亮 ${highlightResult.matched} 个森林样地。`
      );
    }

    if (highlightResult.missing.length > 0) {
      statusMessages.push(
        `未匹配的 FEATURE_ID：${highlightResult.missing.join(", ")}`
      );
    }

    if (statusMessages.length > 0) {
      const status = document.createElement("p");
      status.className = "ai-map-status";
      status.textContent = statusMessages.join("\n");
      aiAnswer.appendChild(status);
    }

  } catch (error) {
    console.error("AI Agent request failed:", error);

    aiAnswer.textContent =
      `AI 请求失败: ${error.message}\n` +
      "请检查 FastAPI 服务和浏览器控制台。";
  } finally {
    aiAskButton.disabled = false;
    aiAskButton.textContent = "发送问题";
  }
});


// Clear AI answer and map highlights
aiClearButton.addEventListener("click", () => {
  clearAIHighlights();
  aiAnswer.textContent = "已清除 AI 分析结果和地图高亮。";
  aiQuestion.value = "";
});


// Collapse or expand chat panel

function setAIChatOpen(open) {
  aiChatBody.hidden = !open;

  aiPanel.classList.toggle("ai-open", open);
  aiPanel.classList.toggle("ai-collapsed", !open);

  aiToggleButton.textContent = open ? "−" : "+";
  aiToggleButton.setAttribute(
    "aria-expanded",
    String(open)
  );

  // On mobile, prevent the stand information
  // panel from covering the AI chat.
  if (open && window.innerWidth <= 768) {
    updateMobilePanelState(false);
  }
}

aiToggleButton.addEventListener("click", () => {
  setAIChatOpen(aiChatBody.hidden);
});

// Mobile: start collapsed.
// Desktop: start expanded.
setAIChatOpen(window.innerWidth > 768);

