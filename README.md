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

The interactive map uses a committed Morton and Burleigh County PMTiles
baseline. See
[`docs/vector-tiles.md`](docs/vector-tiles.md) for archive creation and
direct-update deployment instructions.

## Automatic deployment

Gitea Actions builds and publishes the site after every push to `main`. The
workflow is in [`.gitea/workflows/deploy.yml`](.gitea/workflows/deploy.yml) and
uploads the generated `_site/` directory to
`mhsdemo-deploy@<DEPLOY_HOST>:/var/www/mhsdemo.axvig.com/public/`.

Before the first deployment:

1. Enable Actions for the repository and make sure an `ubuntu-latest` runner is
   available.
2. Create a dedicated SSH key pair for the workflow. Install its public key for
   the `mhsdemo-deploy` account on the web server.
3. Add these repository Actions secrets in Gitea:

   - `DEPLOY_HOST`: the web server hostname or IP address as reached by the
     Actions runner.
   - `DEPLOY_SSH_KEY`: the complete private key, including its BEGIN and END
     lines.
   - `DEPLOY_KNOWN_HOSTS`: the web server's trusted SSH host-key line. Generate
     it from a trusted network with `ssh-keyscan -H <DEPLOY_HOST>`, then verify
     its fingerprint against the server before saving it.

The deploy key only needs write access to the site's `public` directory. The
workflow also supports a manual run from the Actions page.

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

Only landing pages carry `navigation` metadata. Historical records use a stable `id`, `kind`, `section`, and the `records` tag. Section landing pages filter that collection to generate their listings, keeping the global menu useful as the archive grows.

Place-specific fields such as `address` can remain alongside general fields such as `title`, `description`, and `summary`. Coordinates will be added once the map work begins. Legacy provenance is recorded with `legacyUrl` and `sourceFile` while content is being migrated.

## Legacy examples

The authoritative Browsertrix capture is preserved unchanged at
`archive/source/mandanhistory-org.wacz`. The section extractor can reproduce a
focused working set without committing generated intermediates:

```bash
python3 scripts/extract-wacz-section.py \
  archive/source/mandanhistory-org.wacz \
  archive/work/heritage-homes \
  --section heritagehomes/
```

The Heritage Homes detail pages and three earlier examples have been migrated
into clean UTF-8, semantic HTML:

- `src/heritage-homes/dunlap-harris-home.njk`
- `src/biographies/margaret-bowers-bingenheimer.njk`
- `src/resources/mantani.njk`

The source is Windows-1252 HTML produced by an older site builder and contains presentation tables, inline styles, obsolete analytics, duplicated navigation, and some malformed JavaScript. Those wrappers should not be copied into new content.

The Mantani PDF referenced by the old page was not included in the saved files. The new page records its legacy URL but intentionally does not publish a broken download button.

The migrated article wording is intentionally preserved, including apparent spelling mistakes, grammatical errors, inconsistent punctuation, and potentially incorrect facts. The only content-level transformation is conversion from Windows-1252 to UTF-8; the surrounding presentation-table markup was replaced with semantic HTML. Corrections should be made in a later, separately reviewable commit.

The working archive taxonomy, media fields, navigation approach, and future WACZ import plan are described in [`docs/content-model.md`](docs/content-model.md).

The editorial boundaries, versioned-article structure, semantic markup,
indexing conventions, timeline selection, inflation handling, and validation
checklist for article cleanup are documented in
[`docs/copy-editing-guide.md`](docs/copy-editing-guide.md).

The intake, preservation, EXIF, transcription, discrepancy, and presentation
workflow for neighborhood Heritage Home signs is documented in
[`docs/heritage-sign-workflow.md`](docs/heritage-sign-workflow.md).
