# Morton and Burleigh County vector tiles

The site reads the committed `src/tiles/morton-burleigh.pmtiles` archive
directly in the browser with MapLibre GL JS. No always-running tile server is
required.

The baseline archive was extracted from the Protomaps build dated July 23,
2026. It contains zoom levels 0 through 15 and is approximately 21 MB. Its
bounding box is slightly larger than the official Census extents for Morton and
Burleigh counties so labels and roads remain visible at the edges.

## Build an update

Install the [`pmtiles` CLI](https://docs.protomaps.com/pmtiles/cli), choose a
dated Version 4 daily build from
[`maps.protomaps.com/builds`](https://maps.protomaps.com/builds), and run:

```bash
scripts/extract-morton-burleigh-pmtiles.sh \
  https://build.protomaps.com/YYYYMMDD.pmtiles \
  morton-burleigh.pmtiles
```

PMTiles extraction operates on map tiles rather than arbitrary polygons, so the
archive includes a small amount of neighboring context. The script refuses to
overwrite an existing archive.

## Publish an update

The normal site deployment seeds the committed baseline only when the remote
file does not already exist. It excludes the server's `/tiles/` directory from
the normal `rsync --delete`, so a directly uploaded update remains in place
across later site deployments.

After validating a new extraction, upload it under a temporary name and replace
the live file atomically:

```bash
scp morton-burleigh.pmtiles \
  mhsdemo-deploy@SERVER:/var/www/mhsdemo.axvig.com/public/tiles/morton-burleigh.pmtiles.new

ssh mhsdemo-deploy@SERVER \
  mv /var/www/mhsdemo.axvig.com/public/tiles/morton-burleigh.pmtiles.new \
     /var/www/mhsdemo.axvig.com/public/tiles/morton-burleigh.pmtiles
```

The default map URL is `/tiles/morton-burleigh.pmtiles`. `PMTILES_URL` remains
available if the archive is moved to another host later.

The Protomaps fonts and sprites are currently fetched from its public asset
host. They can be mirrored later for a fully self-contained deployment.

## Validate object storage

Check the headers before deploying:

```bash
curl --fail --silent --show-error \
  --range 0-126 \
  --dump-header - \
  --output /dev/null \
  https://mhsdemo.axvig.com/tiles/morton-burleigh.pmtiles
```

Expect status `206`, a 127-byte response, and a `Content-Range` beginning with
`bytes 0-126/`.
