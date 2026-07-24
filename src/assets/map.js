import {
  Map,
  NavigationControl,
  addProtocol,
} from "/assets/vendor/maplibre/maplibre-gl.mjs";

const mapElement = document.querySelector("[data-map]");
const statusElement = document.querySelector("[data-map-status]");

if (mapElement && statusElement) {
  const archiveUrl = mapElement.dataset.pmtilesUrl;
  const protocol = new globalThis.pmtiles.Protocol();
  addProtocol("pmtiles", protocol.tile);

  const map = new Map({
    container: mapElement,
    center: [-100.8896, 46.8267],
    zoom: 12,
    maxBounds: [
      [-102.15, 46.23],
      [-100.02, 47.38],
    ],
    style: {
      version: 8,
      glyphs:
        "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
      sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
      sources: {
        protomaps: {
          type: "vector",
          url: `pmtiles://${new URL(archiveUrl, document.baseURI).href}`,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        },
      },
      layers: globalThis.basemaps.layers(
        "protomaps",
        globalThis.basemaps.namedFlavor("light"),
        { lang: "en" },
      ),
    },
  });

  map.addControl(new NavigationControl(), "top-right");

  map.on("sourcedata", (event) => {
    if (event.sourceId === "protomaps" && event.isSourceLoaded) {
      statusElement.hidden = true;
    }
  });

  map.on("error", (event) => {
    const message = event.error?.message || "The vector tile archive could not be loaded.";
    statusElement.textContent = `Map unavailable: ${message}`;
    statusElement.hidden = false;
  });
}
