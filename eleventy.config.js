import { readFileSync } from "node:fs";

const cpiData = JSON.parse(
  readFileSync(new URL("./src/_data/cpi.json", import.meta.url), "utf8"),
);

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

function mentionIds(mentions = {}) {
  return [...(mentions.people ?? []), ...(mentions.places ?? [])];
}

function recordMap(collection) {
  return new Map(
    collection
      .filter((record) => record.data.id)
      .map((record) => [record.data.id, record]),
  );
}

function mentionedRecords(mentions, collection) {
  const recordsById = recordMap(collection);
  return mentionIds(mentions).map((id) => {
    const record = recordsById.get(id);
    if (!record) {
      throw new Error(`Mention references unknown record ID: ${id}`);
    }
    return record;
  });
}

function mentionsOf(collection, targetId) {
  if (!targetId) {
    return [];
  }

  return collection
    .filter(
      (record) =>
        record.data.id !== targetId &&
        mentionIds(record.data.mentions).includes(targetId),
    )
    .sort((left, right) => left.data.title.localeCompare(right.data.title));
}

function mentionIndex(collection) {
  const recordsById = recordMap(collection);
  const references = new Map();

  for (const source of collection) {
    for (const targetId of mentionIds(source.data.mentions)) {
      if (!recordsById.has(targetId)) {
        throw new Error(
          `Record "${source.data.id}" mentions unknown record ID: ${targetId}`,
        );
      }
      if (!references.has(targetId)) {
        references.set(targetId, []);
      }
      references.get(targetId).push(source);
    }
  }

  return [...references]
    .map(([id, sources]) => ({
      record: recordsById.get(id),
      sources: sources.sort((left, right) =>
        left.data.title.localeCompare(right.data.title),
      ),
    }))
    .sort((left, right) =>
      left.record.data.title.localeCompare(right.record.data.title),
    );
}

function timelineGroups(collection) {
  const events = collection
    .flatMap((record) =>
      (record.data.timeline ?? []).map((event) => {
        if (!event.date || !event.label) {
          throw new Error(
            `Record "${record.data.id}" has a timeline event without a date or label`,
          );
        }
        return { ...event, record };
      }),
    )
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.label.localeCompare(right.label),
    );
  const groups = new Map();

  for (const event of events) {
    const year = Number(event.date.slice(0, 4));
    const decade = `${Math.floor(year / 10) * 10}s`;
    if (!groups.has(decade)) {
      groups.set(decade, []);
    }
    groups.get(decade).push(event);
  }

  return [...groups].map(([decade, groupedEvents]) => ({
    decade,
    events: groupedEvents,
  }));
}

function inflation(amount, sourceYear) {
  const annual = cpiData.annual;
  const targetYear = Math.max(...Object.keys(annual).map(Number));
  const sourceIndex = annual[String(sourceYear)];
  const targetIndex = annual[String(targetYear)];

  if (!sourceIndex) {
    throw new Error(`No CPI value is available for source year ${sourceYear}`);
  }

  const adjusted = amount * (targetIndex / sourceIndex);
  const rounded =
    adjusted >= 1000
      ? Math.round(adjusted / 1000) * 1000
      : adjusted >= 100
        ? Math.round(adjusted / 10) * 10
        : Math.round(adjusted * 100) / 100;
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount < 1 ? 2 : 0,
    maximumFractionDigits: amount < 1 ? 2 : 0,
  });
  const adjustedCurrency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: rounded < 100 ? 2 : 0,
    maximumFractionDigits: rounded < 100 ? 2 : 0,
  });

  return `${currency.format(amount)} (about ${adjustedCurrency.format(rounded)} in ${targetYear} dollars)`;
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
  eleventyConfig.addPassthroughCopy({
    "node_modules/diff/dist/diff.min.js": "assets/vendor/diff.min.js",
  });
  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());
  eleventyConfig.addGlobalData(
    "pmtilesUrl",
    () => process.env.PMTILES_URL || "/tiles/morton-burleigh.pmtiles",
  );
  eleventyConfig.addFilter("navigationTree", buildNavigationTree);
  eleventyConfig.addFilter("recordsForSection", recordsForSection);
  eleventyConfig.addFilter("mentionedRecords", mentionedRecords);
  eleventyConfig.addFilter("mentionsOf", mentionsOf);
  eleventyConfig.addFilter("mentionIndex", mentionIndex);
  eleventyConfig.addFilter("timelineGroups", timelineGroups);
  eleventyConfig.addShortcode("inflation", inflation);

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
