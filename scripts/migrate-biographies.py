#!/usr/bin/env python3
"""Migrate biography pages from extracted WACZ records."""

from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
PAGE_DESTINATION = ROOT / "src/biographies"
IMAGE_DESTINATION = ROOT / "src/assets/images/biographies"

AC_SELECTED = {
    "franklinanders": "franklin-lafayette-anders",
    "jdallen": "john-delbert-allen",
    "georgebingenheimer": "george-h-bingenheimer",
    "richardbaron": "richard-baron",
    "elijahboley": "elijah-boley",
    "philipblumenthal": "philip-blumenthal",
    "frankbriggs": "frank-arlington-briggs",
    "leobroderick": "leo-broderick",
    "williambroderick": "william-broderick",
    "frankbunting": "frank-edward-bunting",
    "lymancary": "lyman-northrop-cary",
    "jamesclark": "james-reed-clark",
    "henrycoe": "henry-waldo-coe",
    "violaboleycoe": "viola-mae-boley-coe",
    "danielcollins": "daniel-collins",
    "elizabethcuster": "elizabeth-bacon-custer",
    "georgecuster": "george-armstrong-custer",
}

SECTIONS = (
    ("biographiesac", ROOT / "archive/work/biographies-ac", AC_SELECTED),
    ("biographiesdl", ROOT / "archive/work/biographies-dl", None),
    ("biographiesmr", ROOT / "archive/work/biographies-mr", None),
    ("biographiessz", ROOT / "archive/work/biographies-sz", None),
)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def asset_name(value: str) -> str:
    path = Path(value)
    stem = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-")
    return stem + path.suffix.lower()


def yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def slugify_title(value: str) -> str:
    without_dates = re.sub(
        r"\s*[\[(]?(?:b\.\s*)?\d{4}\s*(?:-\s*\d{4})?\s*[\])]?\s*$",
        "",
        value,
        flags=re.IGNORECASE,
    )
    return re.sub(r"[^a-z0-9]+", "-", without_dates.lower()).strip("-")


def summary(value: str) -> str:
    selected = []
    for sentence in re.split(r"(?<=[.!?])\s+", value):
        selected.append(sentence)
        if len(" ".join(selected)) >= 100:
            break
    return " ".join(selected)


records = []
for section, work, selected in SECTIONS:
    source = work / section
    if selected:
        pages = ((legacy_name, slug) for legacy_name, slug in selected.items())
    else:
        discovered = []
        for source_path in sorted(source.glob("*.html")):
            soup = BeautifulSoup(
                source_path.read_bytes().decode("cp1252"), "html.parser"
            )
            title = normalize(soup.select("#content .building_block")[0].get_text())
            discovered.append((source_path.stem, slugify_title(title)))
        pages = discovered

    manifest = {
        item["url"]: item
        for item in json.loads(
            (work / "manifest.json").read_text(encoding="utf-8")
        )
    }
    for legacy_name, slug in pages:
        records.append(
            (section, source, work / "images", manifest, legacy_name, slug)
        )


for order, (
    section,
    source,
    image_source,
    manifest,
    legacy_name,
    slug,
) in enumerate(records, start=2):
    relative_source = f"{section}/{legacy_name}.html"
    capture = next(
        item for item in manifest.values() if item["path"] == relative_source
    )
    source_url = capture["url"]
    source_path = source / f"{legacy_name}.html"
    soup = BeautifulSoup(source_path.read_bytes().decode("cp1252"), "html.parser")
    blocks = soup.select("#content .building_block")
    title = normalize(blocks[0].get_text())
    content_blocks = blocks[1:]
    paragraphs = [normalize(block.get_text()) for block in content_blocks]
    description = next((text for text in paragraphs if len(text) >= 100), title)

    destination_images = IMAGE_DESTINATION / slug
    destination_images.mkdir(parents=True, exist_ok=True)
    figures_by_block = []
    all_figures = []
    for block in content_blocks:
        figures = []
        for image in block.select('img[src*="../images/"]'):
            source_image = image_source / Path(image["src"]).name
            if not source_image.exists():
                continue
            name = asset_name(source_image.name)
            shutil.copyfile(source_image, destination_images / name)
            public_path = f"/assets/images/biographies/{slug}/{name}"
            figures.append(public_path)
            all_figures.append(public_path)
        figures_by_block.append(figures)

    timestamp = capture["timestamp"]
    captured_at = (
        f"{timestamp[0:4]}-{timestamp[4:6]}-{timestamp[6:8]}"
        f"T{timestamp[8:10]}:{timestamp[10:12]}:{timestamp[12:14]}Z"
    )
    front_matter = [
        "---",
        "layout: layouts/page.njk",
        f"title: {yaml_string(title)}",
        "eyebrow: Biography",
        f"description: {yaml_string(summary(description))}",
        f"id: {slug}",
        "kind: person",
        "section: biographies",
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
    for paragraph, figures in zip(paragraphs, figures_by_block):
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

    output = "\n".join(front_matter + body).rstrip() + "\n"
    (PAGE_DESTINATION / f"{slug}.njk").write_text(output, encoding="utf-8")
    print(f"Migrated {legacy_name} -> {slug}")
