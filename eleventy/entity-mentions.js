import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const personTagPattern =
  /{%\s*person\s+"([^"]+)"(?:\s*,\s*"([^"]+)")?\s*%}([\s\S]*?){%\s*endperson\s*%}/g;

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

function discoverPeople(articlesDirectory) {
  const people = new Map();
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

    for (const match of source.matchAll(personTagPattern)) {
      const [, id, canonicalName, visibleName] = match;
      if (!stableIdPattern.test(id)) {
        throw new Error(`Inline person ID "${id}" is not a stable slug`);
      }

      const name = canonicalName ?? visibleName;
      const existing = people.get(id);
      if (
        existing &&
        canonicalName &&
        existing.canonicalName &&
        existing.canonicalName !== canonicalName
      ) {
        throw new Error(
          `Inline person "${id}" has conflicting canonical names ` +
            `"${existing.canonicalName}" and "${canonicalName}"`,
        );
      }

      people.set(id, {
        id,
        name: existing?.canonicalName ?? canonicalName ?? existing?.name ?? name,
        canonicalName: existing?.canonicalName ?? canonicalName,
        articleVersionKeys: new Set([
          ...(existing?.articleVersionKeys ?? []),
          articleVersionKey,
        ]),
      });
    }
  }

  return people;
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

function mentionIndex(collection, inlinePeople) {
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

  for (const person of inlinePeople.values()) {
    const record = recordsById.get(person.id);
    const sources = [...person.articleVersionKeys].map((articleVersionKey) => {
      const source = collection.find(
        (candidate) =>
          candidate.data.articleVersionKey === articleVersionKey,
      );
      if (!source) {
        throw new Error(
          `Inline person "${person.id}" belongs to unknown article "${articleVersionKey}"`,
        );
      }
      return {
        record: source,
        url: `${source.url}?view=copy-edited#person-${person.id}`,
      };
    });
    const existing = entries.find((entry) => entry.id === person.id);

    if (existing) {
      for (const source of sources) {
        if (
          !existing.sources.some(
            (candidate) => candidate.record.data.id === source.record.data.id,
          )
        ) {
          existing.sources.push(source);
        }
      }
      continue;
    }

    entries.push({
      id: person.id,
      kind: "person",
      name: record?.data.title ?? person.name,
      record,
      sources,
    });
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function addOccurrenceAnchors(content) {
  const occurrences = new Map();

  return content.replace(
    /<(a|span) class="([^"]*\bperson-mention\b[^"]*)" data-person="([^"]+)"([^>]*)>/g,
    (tag, element, className, id, attributes) => {
      const occurrence = (occurrences.get(id) ?? 0) + 1;
      occurrences.set(id, occurrence);
      const suffix = occurrence === 1 ? "" : `-${occurrence}`;
      return `<${element} class="${className}" id="person-${id}${suffix}" data-person="${id}"${attributes}>`;
    },
  );
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
  const inlinePeople = discoverPeople(articlesDirectory);

  eleventyConfig.addFilter("mentionedRecords", mentionedRecords);
  eleventyConfig.addFilter("mentionsOf", mentionsOf);
  eleventyConfig.addFilter(
    "mentionIndex",
    (collection) => mentionIndex(collection, inlinePeople),
  );
  eleventyConfig.addPairedShortcode(
    "person",
    function (visibleName, id) {
      if (!inlinePeople.has(id)) {
        throw new Error(`Inline person "${id}" was not discovered in source`);
      }
      const record = this.ctx?.collections?.records?.find(
        (candidate) =>
          candidate.data.id === id && candidate.data.kind === "person",
      );
      const url = record?.url ?? `/index/#index-person-${id}`;
      const className = record
        ? "person-mention"
        : "person-mention person-mention-lightweight";
      return `<a class="${className}" data-person="${id}" href="${url}">${visibleName}</a>`;
    },
  );
  eleventyConfig.addTransform("personMentionAnchors", addOccurrenceAnchors);
}
