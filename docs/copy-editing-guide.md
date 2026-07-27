# Historical article copy-editing guide

This guide defines the editorial and technical checks for copy-editing articles
in the Mandan Historical Society site. It is written for any human or automated
editor working in the repository.

The goal is to improve readability and structure while keeping the archived
wording available for comparison and avoiding unintentional changes to the
historical record.

## Core editorial principle

Copy-editing is not the same as fact-checking or rewriting.

A normal copy-edit may:

- correct spelling, grammar, punctuation, capitalization, and spacing;
- repair sentence fragments, run-on sentences, and obvious transcription
  errors;
- improve clarity without changing the claim being made;
- divide or combine paragraphs where the subject or chronology warrants it;
- normalize abbreviations, measurements, dates, and number formatting;
- remove obsolete presentation instructions such as “Click to Enlarge”;
- convert migrated presentation text into semantic headings and captions; and
- add structured links and confirmed index metadata.

A normal copy-edit should not:

- invent or remove historical details;
- silently change dates, names, places, dollar amounts, or reported events;
- make uncertain information sound certain;
- add motives, causes, or conclusions not present in the source;
- replace period terminology merely because it sounds old;
- silently sanitize historically significant language; or
- substantially recast the article in a new voice.

When a claim appears wrong but cannot be resolved as an obvious spelling or
transcription error, preserve it and record the question for factual review.
Make a factual correction only when the evidence is strong and the workflow
explicitly includes fact-checking. Keep factual corrections separately
reviewable whenever practical.

## Preserve work already in progress

Before editing:

1. Check the working tree.
2. Read existing uncommitted differences in the target files.
3. Treat those differences as intentional unless there is clear evidence
   otherwise.
4. Avoid overwriting edits made concurrently by another editor.

If the source changes while work is in progress, reread the affected passage
before applying further edits.

## Read the whole article first

Do not copy-edit isolated sentences without reading the full article. The
initial review should identify:

- the article’s chronology and main subjects;
- year labels and other section boundaries;
- captions fused into body paragraphs;
- names of people and places;
- references to articles already present elsewhere on the site;
- candidate timeline events;
- historical dollar comparisons;
- migration debris and malformed HTML; and
- statements that may require factual review rather than copy-editing.

This review prevents local corrections from introducing repetition,
inconsistent names, or broken chronology.

## Versioned article structure

A copy-edited article normally has three files:

```text
src/area-history/example/index.njk
src/_includes/articles/example/original.njk
src/_includes/articles/example/copy-edited.njk
```

The page controller contains front matter and includes the shared article
version component:

```njk
---
layout: layouts/page.njk
title: Example
id: example
kind: historical-topic
section: area-history
tags: records
articleVersions: true
articleVersionKey: example
editorial:
  status: draft
defaultView: original
---
{% include "components/article-versions.njk" %}
```

The original and copy-edited include files contain article body markup only.
Do not duplicate front matter inside them.

### Original version

Preserve the original displayed wording, including errors. Semantic markup may
be repaired in the original when doing so does not change the wording. Examples
include:

- changing a year from a paragraph to a heading;
- moving caption text from a body paragraph into `figcaption`; and
- adding the same internal link in both versions.

Applying equivalent structural markup to both versions keeps the comparison
focused on editorial wording rather than HTML migration work.

### Copy-edited version

Begin from the original content, then make the editorial changes. Do not edit
only the rendered `_site` output; it is generated and will be replaced on the
next build.

## Paragraphs and headings

Use paragraphs for prose and headings for genuine sections.

In versioned articles, the hidden “Original article” or “Copy-edited article”
label is an `h2`, so year sections within the article use `h3`:

```html
<h3>1941</h3>
```

Apply the same heading structure to both versions.

Split paragraphs when:

- the subject changes;
- a new event begins;
- a long migrated paragraph contains clearly separate items; or
- unrelated facts were joined because legacy markup lost paragraph breaks.

After adding or removing a paragraph, inspect Compare view. The block-alignment
system should show the new block as an insertion or deletion and then realign
later paragraphs. If every later paragraph appears replaced, investigate the
alignment rather than accepting a misleading diff.

## Images, captions, and alternative text

Every existing caption should be inside its corresponding `figure`:

```html
<figure>
  <img src="..." alt="...">
  <figcaption>Caption text</figcaption>
</figure>
```

Common migration problems include:

- captions imported as ordinary paragraphs;
- captions appended to the beginning or end of body prose;
- “Click to Enlarge” left in a caption;
- labels such as newspaper names fused into an article paragraph; and
- captions omitted from the copy-edited version.

For the original version, relocate existing caption wording without correcting
it. For the copy-edited version, correct the caption just as carefully as body
text. Compare view recognizes `figcaption` elements and labels caption changes
separately.

Do not invent a caption merely because an image lacks one. A new descriptive
caption may be added when its content is directly supported by the article,
filename, or collection record, but it should be treated as new editorial
content and reviewed accordingly.

Alternative text and captions have different purposes. Alternative text
describes the image for someone who cannot see it; a caption supplies visible
historical context. Avoid generic alternative text when the image can be
identified confidently.

## Internal links

When an article names a subject that already has a dedicated site record, add a
useful internal link. For example, a reference to the Morton County Courthouse
can link to its Gone Forever article.

Where the wording is identical, add the link to both article versions so it
does not appear as an editorial wording change. Use the record’s canonical site
path rather than a legacy URL.

Do not:

- create nested links;
- link every repeated occurrence of the same place unnecessarily;
- link to a search-results page when a specific record exists; or
- guess a destination from a similar title without confirming the record ID.

## People and the shared index

Confirmed people in copy-edited prose use the `person` paired shortcode:

```njk
{% person "ernie-rober" %}Ernie Rober{% endperson %}
```

The first argument is a stable identity slug, not merely a slug generated for
the current spelling. Before assigning one:

1. Search existing biography records and reuse their `id` when appropriate.
2. Confirm that two similar names are actually the same person.
3. Use one ID for initials, nicknames, married names, and other variants of the
   same person.

When the visible wording is not the preferred index name, provide a canonical
name:

```njk
{% person "blossom-lang-mcgillic", "Blossom Lang McGillic" %}
  Mrs. Blossom [Lang] McGillic
{% endperson %}
```

The entity-mentions plugin creates a lightweight index entry when no biography
exists. Lightweight links use a dotted underline and lead to the shared index.
When a biography with the same ID exists, the name links directly to it with a
normal solid underline. Index links lead back to the highlighted occurrence in
the copy-edited article.

Mark explicitly identified historical people, including credited authors when
useful. Do not create entities for:

- unnamed references such as “his wife” or “the postmaster”;
- organizations, businesses, ships, or government bodies;
- a name whose identity is too ambiguous to assign a stable ID; or
- every person mentioned inside a quotation or linked document when the person
  is not substantively part of the article.

Do not manually wrap `person` markup in another link. The shortcode generates
the appropriate link itself.

Places currently use record IDs in `mentions.places` front matter unless a
dedicated inline place convention has been implemented.

## Dates and timeline entries

Timeline metadata belongs in the page controller, not the body includes:

```yaml
timeline:
  - date: "1941-05-15"
    label: Morton County Courthouse destroyed by fire
```

Always quote timeline dates so YAML keeps them as strings. Supported precision
includes:

- `"1941"`
- `"1941-05"`
- `"1941-05-15"`

Do not invent month or day precision that the article does not provide.

Choose events that help someone understand the development of Mandan and the
surrounding area. Good candidates include major construction, disasters,
transportation changes, civic milestones, notable visits, institutional
openings or closures, and important community events.

Usually omit:

- routine births and deaths;
- ordinary elections unless historically consequential;
- minor business transactions;
- colorful anecdotes that did not materially affect the community; and
- duplicate entries already represented by a more focused article.

Use short, neutral labels in present tense. If a focused article contains the
best date and description, prefer its timeline entry over a duplicate from a
decade overview.

## Historical dollar amounts

Dynamic inflation text uses:

```njk
{% inflation 60000, 1958 %}
```

The shortcode uses the latest annual CPI entry actually present in
`src/_data/cpi.json`; it does not assume the current calendar year is
available.

Before converting a fixed comparison:

1. Confirm that the original amount and source year are known.
2. Confirm that the source year exists in `cpi.json`.
3. Preserve the archived wording in the original version.
4. Use the shortcode only in the copy-edited version.

If the source year is absent, leave the comparison as text rather than
inventing CPI data or silently substituting another year.

## Names, dates, numbers, and style

Apply style consistently within an article:

- add spaces between initials: `J. A. Cowan`;
- use commas where needed around names and titles;
- use `U.S.` as an adjective when that is the site’s established style;
- use typographic minus signs for negative temperatures where practical;
- format temperatures as `115°F`;
- add thousands separators: `4,000`;
- hyphenate compound modifiers: `three-day event`, `600-seat auditorium`;
- write street names consistently with the surrounding article;
- avoid unnecessary honorifics in edited prose unless historically relevant;
- use past tense consistently when narrating completed events; and
- italicize publication, ship, and similar titles when appropriate.

Do not mechanically expand every abbreviation or rewrite every number. Read the
sentence and preserve its intended period context and tone.

## Migration debris and malformed markup

Remove or repair:

- “Click to Enlarge” text when the interface no longer uses it;
- image labels fused into prose;
- duplicated link labels;
- missing spaces between sentences;
- malformed entities and mojibake;
- nested anchors;
- obsolete navigation instructions such as “[Area Landmarks] tab”; and
- raw presentation text that should be a caption or heading.

Keep document links that still resolve. If a linked file is missing, do not
publish a knowingly broken replacement.

## Compare-view quality

The graphical diff is part of editorial review, not merely a presentation
feature. Check all three views:

1. **Original** — archived wording is present and structural markup behaves.
2. **Copy-edited** — edited prose, headings, captions, and links read naturally.
3. **Compare** — actual edits align and later content does not drift after an
   inserted paragraph.

The comparison operates on headings, paragraphs, and captions, then performs a
word-level diff inside aligned blocks. Large rewritten passages may still
produce noisy output; that is often a sign that the edit is broader than a
copy-edit and should be reconsidered or divided into smaller changes.

## Required validation

Run:

```bash
git diff --check
npm run check
npm run build
```

Then inspect the generated or locally served pages for:

- all three article views;
- year-heading hierarchy;
- caption placement and styling;
- paragraph alignment in Compare view;
- internal links;
- people-index entries and highlighted return links;
- solid versus dotted person-link styling;
- timeline entries and ordering;
- inflation output, when used; and
- malformed or nested HTML.

Also review `git status` and the final diff to confirm that:

- unrelated files were not changed;
- concurrent edits were preserved;
- original prose was not accidentally corrected;
- generated `_site` files are not being committed; and
- moves are recognized as moves where practical.

## Final editorial checklist

Before considering an article complete:

- [ ] The whole source article was read before editing.
- [ ] Original displayed wording is preserved.
- [ ] Copy-edits do not intentionally change historical claims.
- [ ] Paragraphs represent coherent subjects or events.
- [ ] Year labels and other sections use proper headings.
- [ ] Existing captions are inside `figcaption`.
- [ ] Caption text is not duplicated in body prose.
- [ ] Dedicated site records are linked where useful.
- [ ] Confirmed named people use stable person IDs.
- [ ] Existing biography IDs were reused.
- [ ] No person shortcode is nested inside a link.
- [ ] Timeline entries are selective, dated conservatively, and quoted in YAML.
- [ ] Inflation shortcodes use CPI years present in the data file.
- [ ] Original, Copy-edited, and Compare views were inspected.
- [ ] Inserted or removed paragraphs do not misalign the remainder of the diff.
- [ ] Eleventy dry-run and production builds pass.
- [ ] The final changes contain no unrelated or overwritten work.

Keep each batch coherent and reviewable. Do not combine broad factual research,
unrelated design changes, or wholesale rewriting with routine copy-editing
unless the task explicitly calls for them.
