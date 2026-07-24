# Proposed content model

This model is based on the legacy pages currently saved in `old-site/`. It is a working design, not a migration of those pages.

## Main idea

The site menu and the historical archive are two different structures.

- The site menu should stay small and lead visitors to landing pages such as People, Places, Events and Exhibits, Research, Visit, Membership, and About.
- Archive records should be classified with structured metadata and shown on generated collection pages, maps, search results, and related-content lists.
- Individual biographies, landmarks, questions, and event records should not all appear in the global menu. The legacy site demonstrates how quickly that becomes difficult to navigate.

A tentative primary navigation is:

1. Explore
   - People
   - Places
   - Topics and eras
   - Questions and answers
2. Events and exhibits
   - Upcoming events
   - Past events
   - Past exhibits
   - History Harvest
3. Research
   - Publications
   - Genealogy resources
   - Documents
4. Visit and participate
   - Museum and office
   - Membership
   - Support the Society
5. About

The exact labels can change without changing the content model.

## Shared record fields

All historical records should use the same small set of shared fields. Additional fields are grouped by record kind.

```yaml
id: dunlap-harris-home
title: Dunlap-Harris Home - 201 7th Ave NW
kind: place
summary: ""
topics:
  - architecture
  - northern-pacific-railway
eras:
  - 1880s
  - 1900s
related:
  people:
    - lyman-cary
    - stuart-dunlap
  places: []
  records: []
legacy:
  url: http://www.mandanhistory.org/heritagehomes/dunlapharrishome.html
  sourceFile: old-site/Dunlap-Harris Home - Mandan Historical Society.html
migration:
  wording: preserved
  editorialReview: false
```

`id` is a stable identifier and should not change when a title or URL changes. Relationships refer to IDs rather than titles or paths.

## Record kinds found in the samples

### Person

The Margaret Bowers Bingenheimer page is the representative example.

```yaml
kind: person
person:
  displayName: Margaret Bowers Bingenheimer
  birthDate: 1865-05-20
  deathDate: 1942
```

Dates are optional. Uncertain dates should remain text or use an explicit qualifier rather than inventing precision.

### Place

Heritage homes, existing landmarks, and vanished buildings share one place model. Collection metadata distinguishes how they are presented.

Representative samples include the Dunlap-Harris Home, Collins Avenue Civic Building, Central School, Collins Avenue Courthouse, Cummins Building, First Lutheran Church, and First National Bank Building.

```yaml
kind: place
place:
  collection: landmarks
  status: standing
  address: 201 7th Avenue NW, Mandan, ND
  latitude:
  longitude:
  built:
    display: "1904"
  demolished:
  alternateNames:
    - Stuart Dunlap Home
    - Tara
```

Suggested `collection` values are `heritage-homes`, `landmarks`, and `gone-forever`. Suggested `status` values are `standing`, `demolished`, `moved`, and `unknown`.

The latitude and longitude belong to the historical record, not a separate map-only data set. Eleventy can generate GeoJSON from these records later.

### Event and exhibit

The samples distinguish recurring programs, one-time public events, and museum exhibits:

- History Harvest is a recurring program with year sections.
- Now & Then is a dated public event.
- The USDA laboratory centennial is a dated partner event with a gallery and document library.
- The Theodore Roosevelt–Henry Waldo Coe and World War II pages describe past exhibits.

```yaml
kind: event
event:
  startDate: 2025-07-21
  endDate:
  recurringSeries:
  venue:
```

```yaml
kind: exhibit
exhibit:
  opened:
  closed:
  venue:
```

Historical event and exhibit records are authored content. Upcoming events can come from a calendar without forcing historical records into the calendar's data model.

### Resource

The *Mantani*, genealogy, membership, and USDA pages link to PDFs, spreadsheets, bylaws, meeting minutes, forms, and external research sites.

Downloads should be data rather than links buried only in prose:

```yaml
downloads:
  - id: mantani-pdf
    title: Sarah Tostevin, Mantani - History 1738-1964
    file:
    legacyUrl: http://www.mandanhistory.org/images/Mantani_Derated.pdf
    format: pdf
    rights: Private, non-commercial use
```

Missing archived files should retain their legacy URL but should be marked unavailable until the file is recovered.

### Question and answer

The Q&A page contains many independently useful records. Each answer should be addressable and searchable without requiring a separate physical file for every short answer.

Two reasonable authoring choices are:

- one Q&A page with stable heading IDs and structured entries in a data file; or
- one content file per answer when answers need their own relationships, images, map points, or citations.

The second option is preferable for substantial answers such as Dogtown, the Boston Syndicate, Hudson Hall, and the Barrows Building.

### Society page

Museum information, membership, endowment, board information, and organizational history are operational pages rather than archive records. They can use normal Eleventy pages and should not be forced into the historical taxonomy.

The current membership sample combines several concerns. In the new site these should be separate pages or sections:

- Join and dues
- Membership form
- Committees and volunteering
- Meeting minutes and bylaws
- Lifetime members
- Board of Directors
- Blue Thunder logo history

## Images and galleries

The samples contain single illustrations, paired then-and-now images, thumbnail galleries, and old JavaScript slideshows. A single media model can support all of them:

```yaml
media:
  - id: dunlap-home-1924
    file: dunlap-harris-home-c1924.jpg
    role: gallery
    alt: ""
    caption: Stuart Dunlap Home c1924
    credit: Mandan Historical Society Collection
    rights: all-rights-reserved
    date:
```

Important rules:

- Preserve legacy captions, credits, and restrictions verbatim during migration.
- Add alt text separately; do not treat an editorially supplied description as original article wording.
- Store one logical image record even when the archive contains thumbnail, medium, and large derivatives.
- Use responsive images generated from the best archived source when appropriate.
- Render a normal figure grid that works without JavaScript. A small browser module may add a larger dialog view, keyboard navigation, and next/previous controls.
- Rights can apply to a whole gallery or to individual images. The History Harvest sample includes a gallery-specific restriction for the Bob Feickert photographs.

## Content preservation

Migration and editing are separate operations.

1. Preserve the visible title, paragraphs, captions, link text, spelling, grammar, and punctuation from the legacy page.
2. Convert Windows-1252 text to UTF-8 and replace presentation tables with semantic HTML.
3. Record the legacy URL and source file.
4. Add accessibility text and structured metadata in clearly separate fields.
5. Make factual or copy edits only in later, reviewable commits.

The original WACZ capture is versioned in Git at
`archive/source/mandanhistory-org.wacz` as an immutable historical artifact.
Migrated content, selected original-quality assets, provenance metadata, and
extraction manifests also belong in Git. Generated extraction workspaces and
other reproducible intermediate files should remain outside Git.

## WACZ import

Browsertrix exports a `.wacz` file: a ZIP package containing WARC captures, an index, page metadata, and package metadata. The preserved archive at `archive/source/mandanhistory-org.wacz` can be used by an importer to:

1. Inventory captured page URLs from `pages/pages.jsonl`.
2. Extract the selected HTML response for each canonical URL.
3. Extract original images, PDFs, spreadsheets, and other linked resources.
4. Deduplicate resources by content hash while retaining every legacy URL.
5. Convert page text to UTF-8 without rewriting it.
6. Produce a migration manifest that maps legacy URLs and capture timestamps to new record IDs and files.
7. Report missing resources, conflicting captures, malformed pages, and links that leave the archive.

Extraction should be deterministic and rerunnable. Page-specific cleanup belongs after the faithful import rather than inside the importer.

## Decisions still needed

- Whether a visitor-facing label should be “Places,” “Landmarks,” or both at different levels.
- Whether recurring History Harvest material remains one chronological page or becomes one record per year.
- Whether substantial Q&A entries become individual records.
- Whether membership, minutes, bylaws, and board information will remain public in the revived site.
- How image rights should be represented when the source page provides no explicit credit or restriction.
- Which source should determine coordinates and authoritative addresses for mapped places.
