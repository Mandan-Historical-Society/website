import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import nunjucks from "nunjucks";
import { citationNotes, citationReference } from "../eleventy/citations.js";

const sources = JSON.parse(readFileSync(new URL("../src/_data/citationSources.json", import.meta.url)));
const sourceId = "langer-richardson-1934-02-06";
const citations = [
  { id: "site", source: sourceId, locator: "Letter p. 1 (PDF p. 2)." },
  { id: "proposal", source: sourceId, locator: "Letter pp. 1–2 (PDF pp. 2–3)." },
];
const context = { id: "eielson-field", citations, citationSources: sources };
const environment = new nunjucks.Environment(new nunjucks.FileSystemLoader(
  new URL("../src/_includes/", import.meta.url).pathname,
), { autoescape: false });
environment.addFilter("citationNotes", citationNotes);

test("different passages of one source retain separate locators and stable fragment links", () => {
  const notes = citationNotes(citations, sources, context.id);
  assert.equal(notes[0].source, notes[1].source);
  assert.notEqual(notes[0].locator, notes[1].locator);
  assert.match(citationReference("proposal", context), /href="#source-eielson-field-proposal"[^>]*>\[2\]/);
  assert.equal(citationReference("site", context), citationReference("site", context));
  assert.doesNotMatch(citationReference("site", context), /\sid=/);
  assert.match(citationReference("site", { ...context, id: "another-article" }), /#source-another-article-site/);
});

test("unresolved evidence references and duplicate note IDs stop the build", () => {
  assert.throws(() => citationReference("missing", context), /Unknown citation note/);
  assert.throws(() => citationNotes([{ id: "site", source: "missing" }], sources, context.id), /unknown source/);
  assert.throws(() => citationNotes([citations[0], citations[0]], sources, context.id), /Duplicate citation note/);
  assert.throws(() => citationNotes(citations, sources, 'invalid"id'), /stable lowercase slug/);
  assert.throws(() => citationNotes([{ id: "bad id", source: sourceId }], sources, context.id), /stable lowercase slug/);
});

test("source links reject unsafe protocols and incomplete provenance", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,bad", "/relative"] ) {
    const changed = { [sourceId]: { ...sources[sourceId], url } };
    assert.throws(() => citationNotes(citations, changed, context.id), /HTTP or HTTPS/);
  }
  const changed = { [sourceId]: { ...sources[sourceId], repository: "" } };
  assert.throws(() => citationNotes(citations, changed, context.id), /needs repository/);
});

test("the shared template escapes source text and shows an explanatory note", () => {
  const citationSources = { [sourceId]: { ...sources[sourceId], author: '<script>alert("x")</script>' } };
  const html = environment.render("components/source-notes.njk", {
    ...context, citationSources,
    citations: [{ ...citations[0], explanation: "A proposal, not its adoption." }],
  });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /id="source-eielson-field-site"/);
  assert.match(html, /Letter p\. 1 \(PDF p\. 2\)/);
  assert.match(html, /A proposal, not its adoption/);
  assert.match(html, /article=1068&amp;context=langer-papers/);
});

test("drafts distinguish archived text from sourced additions; confirmed and unversioned pages retain notes", () => {
  const render = (extra) => environment.render("components/source-notes.njk", { ...context, ...extra });
  assert.match(render({ articleVersions: true, editorial: { status: "draft", defaultView: "original" } }), /data-article-sources hidden/);
  assert.doesNotMatch(render({ articleVersions: true, editorial: { status: "draft", defaultView: "copy-edited" } }), /\shidden/);
  assert.doesNotMatch(render({ articleVersions: true, editorial: { status: "confirmed" } }), /data-article-sources|\shidden/);
  assert.match(render({}), /<h2 id="sources-eielson-field">Sources<\/h2>/);
  assert.equal(environment.render("components/source-notes.njk", {}).trim(), "");
});
