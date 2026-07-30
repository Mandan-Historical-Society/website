# Heritage Home sign workflow

This guide covers the neighborhood interpretive signs photographed at historic
homes in Mandan. It supplements the general content model and copy-editing
guide.

## Core rule

One physical home has one canonical place record.

A Heritage Homes article and an interpretive sign are sources about that place,
not separate records. When both exist, add the sign as supplemental content on
the existing Heritage Home page. When only a sign exists, create a sign-based
place record that can later absorb an article without changing its ID or URL.

Before creating a record, search existing Heritage Homes, biographies, place
records, and alternate names by both house name and street address.

## Intake checklist

For each sign:

1. Record the supplied street address.
2. Identify the house name printed on the sign.
3. Search for an existing record by name and address.
4. Preserve the unmodified photograph.
5. Create an optimized copy for the website.
6. Extract the capture time and GPS coordinates from the original EXIF data.
7. Transcribe only text that can be read or corroborated.
8. Record uncertainties, discrepancies, and the review status.
9. Build the site and inspect the home page and Heritage Homes listing.

Do not silently correct the sign, infer unreadable words, or create two place
records for the same property.

## Image storage

Preserve the submitted file unchanged at:

```text
archive/source/heritage-signs/PXL_YYYYMMDD_HHMMSS.jpg
```

Create a web-sized image at:

```text
src/assets/images/heritage-signs/<record-id>-sign-<year>.jpg
```

The current web images have a maximum dimension of 1,800 pixels, use stripped
metadata, and use JPEG quality 82. The original retains its full resolution and
metadata. Do not remove a submitted root-level photograph unless its owner
explicitly asks for that cleanup.

The page image needs alt text describing the visible sign and relevant context.
Its caption should identify the sign and may invite the visitor to open the
larger image.

## Place and photograph coordinates

Keep two concepts separate:

- `place.latitude` and `place.longitude` locate the property on the public map.
- `photoLatitude` and `photoLongitude` record where the photograph was taken.

EXIF coordinates often represent the sidewalk, street, or an imprecise phone
location. They are provenance, not automatically the property coordinate.

Add `place.latitude` and `place.longitude` only after the property point has
been verified. Until then, omit them. A record without property coordinates
appears in the Heritage Homes listing but not on the map.

Convert EXIF degrees, minutes, and seconds to signed decimal degrees. Northern
latitudes are positive; western longitudes are negative. Preserve reasonable
precision without implying that the phone reading identifies the exact
building footprint.

## Record metadata

A sign-only record uses the normal Heritage Home place model:

```yaml
---
layout: layouts/page.njk
title: Example Home - 123 4th Avenue NW
eyebrow: Heritage Home
description: The Example Home is identified by a Heritage Home sign at 123 4th Avenue NW.
address: 123 4th Avenue NW, Mandan, ND
id: example-home
kind: place
section: heritage-homes
order: 50
tags: records
place:
  status: standing
  collection: heritage-homes
sources:
  - type: interpretive-sign
    title: Example Home heritage sign
    image: /assets/images/heritage-signs/example-home-sign-2026.jpg
    sourceFile: archive/source/heritage-signs/PXL_20260728_000000000.jpg
    photographedAt: 2026-07-28T18:00:00-05:00
    photoLatitude: 46.000000
    photoLongitude: -100.000000
    transcriptionStatus: needs-review
card:
  title: Example Home
  meta: 123 4th Avenue NW
  image: /assets/images/heritage-signs/example-home-sign-2026.jpg
  imageAlt: The Example Home heritage sign
---
```

Use a descriptive address-based ID only when the historical name is not yet
known. IDs are stable, so rename the page title and card later without changing
the ID merely for cosmetic consistency.

Use `related` to connect a home to an existing person or place record when the
relationship is deliberate and supported:

```yaml
related:
  people:
    - frank-edward-bunting
```

## Pending photographs

When a sign is known to exist but has not been photographed, a minimal record
may use:

```yaml
sources:
  - type: interpretive-sign
    title: Heritage Home sign
    photographStatus: awaiting-photograph
    transcriptionStatus: awaiting-photograph
```

The page should state that its name, location, and history await confirmation.
Do not invent coordinates, a historical name, or descriptive history.

The record for 309 5th Avenue NW is the current example.

## Transcription states

Use these values consistently:

- `awaiting-photograph`: the sign is reported but no source image is available.
- `needs-review`: a photograph exists, but a reliable transcription has not
  been completed.
- `draft`: a transcription is published for review but has not received a
  second check.
- `cross-checked`: faded wording was compared with another preserved version
  of the same source text.
- `reviewed`: a person has compared and corrected the complete transcription
  against the photographed sign.

`cross-checked` does not mean historically fact-checked. It means the displayed
wording has been checked against another source copy.

`reviewed` confirms the transcription, not every historical claim printed on
the sign. Record the review date as `transcriptionReviewedAt`.

## Faithful transcription

A transcription preserves the sign as a source:

- Keep its spelling, grammar, punctuation, names, dates, and printed address.
- Do not silently repair apparent errors.
- Do not expand abbreviations unless the expansion is printed elsewhere.
- Mark unreadable text rather than guessing.
- Include printed titles and addresses when they are part of the sign.
- Record a byline, sponsor, or source note when it can be read confidently.
- State how faded passages were corroborated.

Normal typographic characters such as curly apostrophes may be used without
changing the wording. Paragraph breaks may follow the sign's visual sections.

The sign transcription is not the `original` version of a Heritage Homes
article. The sign and article are distinct sources. The site's Original,
Copy-edited, and Compare controls remain reserved for editorial variants of the
same article.

## Errors and discrepancies

Store both the verified value and the printed value when a sign contains an
error. The canonical page metadata uses the verified property information; the
source metadata and faithful transcription preserve what the sign says.

For example, the Tavis Home is at 205 4th Avenue NW, while its sign incorrectly
prints 250:

```yaml
address: 205 4th Avenue NW, Mandan, ND
sources:
  - type: interpretive-sign
    printedAddress: 250 4th Avenue NW
    addressNote: The sign incorrectly gives the house number as 250; the property address is 205.
```

Also display a concise correction near the sign so visitors are not left to
resolve the conflict themselves. Do not change `250` to `205` inside the
faithful transcription.

Apparent factual errors in historical prose require historical review.
Ordinary copy editing belongs in a separately labeled editorial version.

## Page presentation

When a Heritage Homes article already exists:

1. Leave the main article and its editorial-version controls unchanged.
2. Add an “On the property” supplemental-source section after the article.
3. Show the sign photograph and capture date.
4. Put a duplicate or lengthy transcription in a collapsed `<details>` element.
5. Explain whether the sign repeats, summarizes, or differs from the article.

The Ellis-Uden Home is the current article-plus-sign example.

For a sign-only record:

1. Give a short sourced introduction.
2. Link deliberately related records when available.
3. Present the sign photograph as the principal source.
4. Publish a transcription only at the appropriate review state.
5. Use a visible “Transcription in progress” notice when it is not ready.

The Kelsh and Bunting homes are current sign-only examples. The Tavis Home
demonstrates a sign-only record with a draft transcription and address
correction.

## Review and validation

Before considering a sign record complete, verify:

- The address belongs to the photographed property.
- No existing place record represents the same home.
- The stable ID and public URL are appropriate.
- The original image is preserved unchanged.
- The optimized image loads and has useful alt text.
- Capture time and photo coordinates match the original EXIF data.
- Property coordinates, if present, were independently verified.
- The transcription status accurately describes the work completed.
- Printed errors remain visible in the source transcription.
- Corrections and uncertainties are explicitly explained.
- Related record IDs resolve.
- The Heritage Homes card has the intended title, address, and image.
- The site build succeeds.

Run:

```bash
npm run build
git diff --check
```

Then inspect the generated detail page, Heritage Homes listing, and map marker
when verified property coordinates are present.
