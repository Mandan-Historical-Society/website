function buildNavigationTree(collection) {
  const nodesByKey = new Map();

  for (const page of collection) {
    const navigation = page.data.navigation;
    if (!navigation?.key) {
      continue;
    }

    if (nodesByKey.has(navigation.key)) {
      throw new Error(`Duplicate navigation key: ${navigation.key}`);
    }

    nodesByKey.set(navigation.key, {
      key: navigation.key,
      label: navigation.label ?? page.data.title,
      order: navigation.order ?? 0,
      parent: navigation.parent ?? null,
      url: page.url,
      children: [],
    });
  }

  const roots = [];
  for (const node of nodesByKey.values()) {
    if (!node.parent) {
      roots.push(node);
      continue;
    }

    const parent = nodesByKey.get(node.parent);
    if (!parent) {
      throw new Error(`Navigation item "${node.key}" has unknown parent "${node.parent}"`);
    }
    parent.children.push(node);
  }

  const sortNodes = (nodes) => {
    nodes.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
    for (const node of nodes) {
      sortNodes(node.children);
    }
    return nodes;
  };

  return sortNodes(roots);
}

function recordsForSection(collection, section) {
  return collection
    .filter((page) => page.data.section === section)
    .sort(
      (left, right) =>
        (left.data.order ?? 0) - (right.data.order ?? 0) ||
        left.data.title.localeCompare(right.data.title),
    );
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/tiles": "tiles" });
  eleventyConfig.addPassthroughCopy({
    "node_modules/maplibre-gl/dist": "assets/vendor/maplibre",
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/pmtiles/dist/pmtiles.js": "assets/vendor/pmtiles.js",
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/@protomaps/basemaps/dist/basemaps.js": "assets/vendor/basemaps.js",
  });
  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());
  eleventyConfig.addGlobalData(
    "pmtilesUrl",
    () => process.env.PMTILES_URL || "/tiles/morton-burleigh.pmtiles",
  );
  eleventyConfig.addFilter("navigationTree", buildNavigationTree);
  eleventyConfig.addFilter("recordsForSection", recordsForSection);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
