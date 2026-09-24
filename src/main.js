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
viewer.camera.flyTo({
  destination: Cartesian3.fromDegrees(
    -123.7950,
    49.1239,
    6000
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

  },

  ScreenSpaceEventType.LEFT_CLICK

);