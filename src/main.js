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
Ion.defaultAccessToken =
  import.meta.env.VITE_CESIUM_ION_TOKEN;


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

// Return the original AGB color of a stand
function getStandColor(entity) {

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
  else
  return Color.RED.withAlpha(0.65);
}

// Polygon styling
const standEntities = forestStands.entities.values;

for (const entity of standEntities) {
  if (!entity.polygon || !entity.properties) {
    continue;
  }

  entity.polygon.material =
    getStandColor(entity);
}

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

// Highlight settings

let selectedStand = null;
let highlightLine = null;


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
          getStandColor(selectedStand);

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
        getStandColor(selectedStand);
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