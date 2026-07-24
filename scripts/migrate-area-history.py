#!/usr/bin/env python3
"""Create Area History records from the extracted WACZ section."""

from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "archive/work/area-history"
SOURCE = WORK / "areahistory"
ASSET_SOURCE = WORK / "images"
PAGE_DESTINATION = ROOT / "src/area-history"
IMAGE_DESTINATION = ROOT / "src/assets/images/area-history"
DOCUMENT_DESTINATION = ROOT / "src/assets/documents/area-history"

SLUGS = {
    "1901panamexpo": "1901-pan-american-exposition",
    "1903trvisittondak": "1903-theodore-roosevelt-visit",
    "1910springflood": "1910-spring-flood",
    "1911fairairplanedemo": "1911-fair-and-airplane-demonstration",
    "1912trwhistlestop": "1912-theodore-roosevelt-whistle-stop",
    "1958lincolnstampfdc": "1958-lincoln-stamp-first-day-covers",
    "1stofthe21st": "2000s",
    "20102019": "2010s",
    "2020present": "2020s",
    "custerdramatrailwest": "trail-west-outdoor-custer-drama",
    "fdrvisitaugust1936": "1936-franklin-roosevelt-visit",
    "mailorderkithomes": "mail-order-kit-homes",
    "mandanrodeofair": "mandan-rodeo-and-missouri-slope-fair",
    "schoolsystemhistory": "mandan-school-system-history",
    "the1870s": "1870s",
    "the1880s": "1880s",
    "the1890s": "1890s",
    "the1900s": "1900s",
    "the1910s": "1910s",
    "the1920s": "1920s",
    "the1930s": "1930s",
    "the1940s": "1940s",
    "the1950s": "1950s",
    "the1960s": "1960s",
    "the1970s": "1970s",
    "the1980s": "1980s",
    "the1990s": "1990s",
}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def asset_name(value: str) -> str:
    path = Path(value)
    stem = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-")
    return stem + path.suffix.lower()


def yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def summary(value: str) -> str:
    selected = []
    for sentence in re.split(r"(?<=[.!?])\s+", value):
        selected.append(sentence)
        if len(" ".join(selected)) >= 100:
            break
    return " ".join(selected)


manifest = json.loads((WORK / "manifest.json").read_text(encoding="utf-8"))
manifest_by_path = {item["path"]: item for item in manifest}

PAGE_DESTINATION.mkdir(parents=True, exist_ok=True)
IMAGE_DESTINATION.mkdir(parents=True, exist_ok=True)
DOCUMENT_DESTINATION.mkdir(parents=True, exist_ok=True)

for order, source_path in enumerate(sorted(SOURCE.glob("*.html")), start=1):
    legacy_name = source_path.stem
    if legacy_name == "bookmantani":
        continue

    slug = SLUGS[legacy_name]
    relative_source = f"areahistory/{legacy_name}.html"
    capture = manifest_by_path[relative_source]
    source_url = capture["url"]
    soup = BeautifulSoup(source_path.read_bytes().decode("cp1252"), "html.parser")
    blocks = soup.select("#content .building_block")
    title = normalize(blocks[0].get_text())
    content_blocks = blocks[1:]

    destination_images = IMAGE_DESTINATION / slug
    destination_images.mkdir(parents=True, exist_ok=True)
    figures_by_block = []
    links_by_block = []
    all_figures = []
    for block in content_blocks:
        figures = []
        used_names: dict[str, int] = {}
        for image in block.select('img[src*="../images/"]'):
            if "/photoalbum/" in image["src"]:
                continue
            source_asset = ASSET_SOURCE / Path(image["src"]).name
            if not source_asset.exists():
                print(f"Missing captured image referenced by {legacy_name}: {image['src']}")
                continue
            name = asset_name(source_asset.name)
            if name in used_names:
                used_names[name] += 1
                name = f"{Path(name).stem}-{used_names[name]}{Path(name).suffix}"
            else:
                used_names[name] = 1
            shutil.copyfile(source_asset, destination_images / name)
            public_path = f"/assets/images/area-history/{slug}/{name}"
            figures.append(public_path)
            all_figures.append(public_path)
        figures_by_block.append(figures)

        links = []
        for link in block.select("a[href]"):
            label = normalize(link.get_text())
            href = link["href"]
            if href in {"#", "javascript://"}:
                continue
            if href.startswith("../images/"):
                source_asset = ASSET_SOURCE / Path(href).name
                if source_asset.exists():
                    name = asset_name(source_asset.name)
                    shutil.copyfile(source_asset, DOCUMENT_DESTINATION / name)
                    href = f"/assets/documents/area-history/{name}"
                    if not label:
                        label = source_asset.stem.replace("_", " ")
            if not label:
                continue
            links.append((label, href))
        links_by_block.append(links)

    paragraphs = [normalize(block.get_text()) for block in content_blocks]
    description = next((text for text in paragraphs if len(text) >= 100), title)
    timestamp = capture["timestamp"]
    captured_at = (
        f"{timestamp[0:4]}-{timestamp[4:6]}-{timestamp[6:8]}"
        f"T{timestamp[8:10]}:{timestamp[10:12]}:{timestamp[12:14]}Z"
    )
    front_matter = [
        "---",
        "layout: layouts/page.njk",
        f"title: {yaml_string(title)}",
        "eyebrow: Area History",
        f"description: {yaml_string(summary(description))}",
        f"id: {slug}",
        "kind: historical-topic",
        "section: area-history",
        f"order: {order * 10}",
        "tags: records",
        f"legacyUrl: {source_url}",
        "sourceFile: archive/source/mandanhistory-org.wacz",
        f"capturedAt: {captured_at}",
        "card:",
        f"  title: {yaml_string(title)}",
        '  meta: ""',
        f"  image: {all_figures[0] if all_figures else ''}",
        f"  imageAlt: {yaml_string('Historic image from the ' + title + ' page')}",
        "---",
    ]

    body = []
    for paragraph, figures, links in zip(
        paragraphs, figures_by_block, links_by_block
    ):
        if figures:
            body.append('<div class="image-gallery">')
            for public_path in figures:
                body.extend(
                    [
                        "  <figure>",
                        f'    <img src="{public_path}" alt="{html.escape("Historic image from the " + title + " page", quote=True)}">',
                        "  </figure>",
                    ]
                )
            body.extend(["</div>", ""])
        if paragraph:
            body.extend([f"<p>{html.escape(paragraph, quote=False)}</p>", ""])
        for label, href in links:
            body.extend(
                [
                    f'<p><a href="{html.escape(href, quote=True)}">{html.escape(label)}</a></p>',
                    "",
                ]
            )

    output = "\n".join(front_matter + body).rstrip() + "\n"
    (PAGE_DESTINATION / f"{slug}.njk").write_text(output, encoding="utf-8")
    print(f"Migrated {legacy_name} -> {slug}")
