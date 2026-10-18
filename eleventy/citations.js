const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function stableId(value, label) {
  if (typeof value !== "string" || !stableIdPattern.test(value)) {
    throw new Error(`${label} must be a stable lowercase slug`);
  }
  return value;
}

function sourceUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL`);
  }
}

export function citationNotes(citations = [], sources = {}, articleId) {
  if (!Array.isArray(citations)) {
    throw new Error("citations must be a list of source notes");
  }
  if (!citations.length) {
    return [];
  }
  stableId(articleId, "An article with citations needs an id that");
  const seen = new Set();
  return citations.map((note, index) => {
    stableId(note.id, "Citation note id");
    stableId(note.source, `Citation "${note.id}" source id`);
    if (seen.has(note.id)) {
      throw new Error(`Duplicate citation note id: ${note.id}`);
    }
    seen.add(note.id);
    const source = Object.hasOwn(sources, note.source) && sources[note.source];
    if (!source) {
      throw new Error(`Citation "${note.id}" references unknown source: ${note.source}`);
    }
    for (const field of ["title", "repository", "url", "accessed"]) {
      if (typeof source[field] !== "string" || !source[field].trim()) {
        throw new Error(`Source "${note.source}" needs ${field}`);
      }
    }
    sourceUrl(source.url, `Source "${note.source}" url`);
    if (source.documentUrl) {
      sourceUrl(source.documentUrl, `Source "${note.source}" documentUrl`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.accessed)) {
      throw new Error(`Source "${note.source}" accessed date must be a quoted YYYY-MM-DD string`);
    }
    return {
      ...note,
      source,
      number: index + 1,
      anchor: `source-${articleId}-${note.id}`,
    };
  });
}

export function citationReference(noteId, context) {
  const note = citationNotes(
    context.citations,
    context.citationSources,
    context.id,
  ).find((candidate) => candidate.id === noteId);
  if (!note) {
    throw new Error(`Unknown citation note "${noteId}" in article "${context.id}"`);
  }
  // References have no id, so repeat citations and Compare-view copies are safe.
  return `<sup class="citation-reference"><a href="#${note.anchor}" role="doc-noteref" aria-label="Source note ${note.number}">[${note.number}]</a></sup>`;
}

export default function citationsPlugin(eleventyConfig) {
  eleventyConfig.addFilter("citationNotes", citationNotes);
  eleventyConfig.addShortcode("cite", function (noteId) {
    return citationReference(noteId, this.ctx);
  });
}
