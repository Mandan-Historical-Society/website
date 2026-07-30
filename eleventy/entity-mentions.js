import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const inlineTagPatterns = {
  person:
    /{%\s*person\s+"([^"]+)"\s*%}([\s\S]*?){%\s*endperson\s*%}/g,
  place:
    /{%\s*place\s+"([^"]+)"\s*%}([\s\S]*?){%\s*endplace\s*%}/g,
};

function* filesWithin(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* filesWithin(entryPath);
    } else if (entry.isFile()) {
      yield entryPath;
    }
  }
}

function discoverInlineEntities(articlesDirectory) {
  const entities = {
    person: new Map(),
    place: new Map(),
  };
  const directory =
    articlesDirectory instanceof URL
      ? fileURLToPath(articlesDirectory)
      : articlesDirectory;

  for (const inputPath of filesWithin(directory)) {
    if (basename(inputPath) !== "copy-edited.njk") {
      continue;
    }

    const articleVersionKey = basename(dirname(inputPath));
    const source = readFileSync(inputPath, "utf8");

    for (const [kind, pattern] of Object.entries(inlineTagPatterns)) {
      for (const match of source.matchAll(pattern)) {
        const [, id] = match;
        if (!stableIdPattern.test(id)) {
          throw new Error(`Inline ${kind} ID "${id}" is not a stable slug`);
        }

        const existing = entities[kind].get(id);
        entities[kind].set(id, {
          id,
          kind,
          articleVersionKeys: new Set([
            ...(existing?.articleVersionKeys ?? []),
            articleVersionKey,
          ]),
        });
      }
    }
  }

  return entities;
}

function mentionIds(mentions = {}) {
  return [...(mentions.people ?? []), ...(mentions.places ?? [])];
}

function recordMap(collection) {
  const records = new Map();
  for (const record of collection.filter((candidate) => candidate.data.id)) {
    const existing = records.get(record.data.id);
    if (existing) {
      throw new Error(
        `Duplicate record ID "${record.data.id}" in ` +
          `"${existing.inputPath}" and "${record.inputPath}"`,
      );
    }
    records.set(record.data.id, record);
  }
  return records;
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

function mentionIndex(collection, inlineEntities) {
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

  const entries = [...references].map(([id, sources]) => {
    const record = recordsById.get(id);
    return {
      id,
      kind: record.data.kind,
      name: record.data.title,
      record,
      sources: sources
        .sort((left, right) =>
          left.data.title.localeCompare(right.data.title),
        )
        .map((source) => ({ record: source, url: source.url })),
    };
  });

  for (const entities of Object.values(inlineEntities)) {
    for (const entity of entities.values()) {
      const record = recordsById.get(entity.id);
      if (!record) {
        throw new Error(
          `Inline ${entity.kind} "${entity.id}" has no entity record`,
        );
      }
      if (record.data.kind !== entity.kind) {
        throw new Error(
          `Inline ${entity.kind} "${entity.id}" conflicts with ` +
            `${record.data.kind} record of the same ID`,
        );
      }

      const sources = [...entity.articleVersionKeys].map(
        (articleVersionKey) => {
          const source = collection.find(
            (candidate) =>
              candidate.data.articleVersionKey === articleVersionKey,
          );
          if (!source) {
            throw new Error(
              `Inline ${entity.kind} "${entity.id}" belongs to unknown ` +
                `article "${articleVersionKey}"`,
            );
          }
          return {
            record: source,
            url:
              `${source.url}?view=copy-edited` +
              `#${entity.kind}-${entity.id}`,
          };
        },
      );
      const existing = entries.find((entry) => entry.id === entity.id);

      if (existing) {
        for (const source of sources) {
          if (
            !existing.sources.some(
              (candidate) =>
                candidate.record.data.id === source.record.data.id,
            )
          ) {
            existing.sources.push(source);
          }
        }
        continue;
      }

      entries.push({
        id: entity.id,
        kind: entity.kind,
        name: record.data.title,
        record,
        sources,
      });
    }
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function addOccurrenceAnchors(content) {
  const occurrences = new Map();

  return content.replace(
    /<(a|span) class="([^"]*\b(person|place)-mention\b[^"]*)" data-(person|place)="([^"]+)"([^>]*)>/g,
    (tag, element, className, kind, dataKind, id, attributes) => {
      if (kind !== dataKind) {
        return tag;
      }
      const occurrenceKey = `${kind}:${id}`;
      const occurrence = (occurrences.get(occurrenceKey) ?? 0) + 1;
      occurrences.set(occurrenceKey, occurrence);
      const suffix = occurrence === 1 ? "" : `-${occurrence}`;
      return `<${element} class="${className}" id="${kind}-${id}${suffix}" data-${kind}="${id}"${attributes}>`;
    },
  );
}

function inlineEntityShortcode(inlineEntities, kind, visibleName, id, context) {
  if (!inlineEntities[kind].has(id)) {
    throw new Error(`Inline ${kind} "${id}" was not discovered in source`);
  }
  const record = context?.collections?.records?.find(
    (candidate) =>
      candidate.data.id === id && candidate.data.kind === kind,
  );
  if (!record) {
    throw new Error(`Inline ${kind} "${id}" has no entity record`);
  }
  const isPublished =
    record.data.entityStatus !== "mention-only" && Boolean(record.url);
  const indexName = kind === "person" ? "people" : "places";
  const url = isPublished
    ? record.url
    : `/explore/${indexName}/#index-${kind}-${id}`;
  const className = isPublished
    ? `${kind}-mention`
    : `${kind}-mention ${kind}-mention-lightweight`;
  return `<a class="${className}" data-${kind}="${id}" href="${url}">${visibleName}</a>`;
}

export default function entityMentionsPlugin(
  eleventyConfig,
  {
    articlesDirectory = new URL(
      "../src/_includes/articles/",
      import.meta.url,
    ),
  } = {},
) {
  const inlineEntities = discoverInlineEntities(articlesDirectory);

  eleventyConfig.addFilter("mentionedRecords", mentionedRecords);
  eleventyConfig.addFilter("mentionsOf", mentionsOf);
  eleventyConfig.addFilter(
    "mentionIndex",
    (collection) => mentionIndex(collection, inlineEntities),
  );
  eleventyConfig.addPairedShortcode(
    "person",
    function (visibleName, id) {
      return inlineEntityShortcode(
        inlineEntities,
        "person",
        visibleName,
        id,
        this.ctx,
      );
    },
  );
  eleventyConfig.addPairedShortcode(
    "place",
    function (visibleName, id) {
      return inlineEntityShortcode(
        inlineEntities,
        "place",
        visibleName,
        id,
        this.ctx,
      );
    },
  );
  eleventyConfig.addTransform("entityMentionAnchors", addOccurrenceAnchors);
}
