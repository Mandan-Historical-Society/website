# Mandan Historical Society

Static historical archive built with Eleventy. Eleventy generates ordinary HTML; maps and other interactive features can use plain browser JavaScript.

## Commands

```bash
npm install
npm run serve
```

Create the deployable `_site` directory with:

```bash
npm run build
```

## Content model

Pages live under `src/` in the same hierarchy used for their public URLs. Each navigable page has a `navigation` object in its front matter:

```yaml
navigation:
  key: dunlap-harris-home
  label: Dunlap-Harris Home
  parent: heritage-homes
  order: 20
```

`eleventy.config.js` validates those relationships and builds the nested site menu. A missing parent or duplicate key fails the build instead of silently producing a broken menu.

Place-specific fields such as `address` can remain alongside general fields such as `title`, `description`, and `summary`. Coordinates will be added once the map work begins. Legacy provenance is recorded with `legacyUrl` and `sourceFile` while content is being migrated.

## Legacy examples

The untouched saved pages remain in `old-site/`. Three examples have been migrated into clean UTF-8, semantic HTML:

- `src/heritage-homes/dunlap-harris-home.njk`
- `src/biographies/margaret-bowers-bingenheimer.njk`
- `src/resources/mantani.njk`

The source was Windows-1252 HTML produced by an older site builder and contains presentation tables, inline styles, obsolete analytics, duplicated navigation, and some malformed JavaScript. Those wrappers should not be copied into new content.

The Mantani PDF referenced by the old page was not included in the saved files. The new page records its legacy URL but intentionally does not publish a broken download button.

The migrated article wording is intentionally preserved, including apparent spelling mistakes, grammatical errors, inconsistent punctuation, and potentially incorrect facts. The only content-level transformation is conversion from Windows-1252 to UTF-8; the surrounding presentation-table markup was replaced with semantic HTML. Corrections should be made in a later, separately reviewable commit.
