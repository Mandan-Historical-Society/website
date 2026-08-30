#!/usr/bin/env python3
"""Migrate the remaining miscellaneous pages from extracted WACZ records."""

from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
IMAGE_DESTINATION = ROOT / "src/assets/images/miscellaneous"
DOCUMENT_DESTINATION = ROOT / "src/assets/documents"

PAGES = (
    {
        "work": "misc-genealogy",
        "source": "genealogylinks.html",
        "destination": "src/resources/genealogy-links.njk",
        "slug": "genealogy-links",
        "eyebrow": "Historical Resources",
        "kind": "resource",
        "section": "resources",
        "order": 20,
    },
    {
        "work": "misc-qa",
        "source": "qa.html",
        "destination": "src/resources/questions-and-answers.njk",
        "slug": "questions-and-answers",
        "eyebrow": "Historical Resources",
        "kind": "resource",
        "section": "resources",
        "order": 30,
    },
    {
        "work": "misc-membership",
        "source": "membership.html",
        "destination": "src/support/membership.njk",
        "slug": "membership",
        "eyebrow": "Support the Society",
        "kind": "society-page",
        "section": "support",
        "order": 20,
    },
    {
        "work": "events-activities",
        "source": "eventsactivities/museumoffice.html",
        "destination": "src/support/museum-and-office.njk",
        "slug": "museum-and-office",
        "eyebrow": "Visit",
        "kind": "society-page",
        "section": "support",
        "order": 30,
    },
    {
        "work": "events-activities",
        "source": "eventsactivities/ngprscentlcelebration.html",
        "destination": "src/events/ag-station-centennial.njk",
        "slug": "ag-station-centennial",
        "eyebrow": "Past program",
        "kind": "event",
        "section": "events",
        "order": 20,
    },
    {
        "work": "events-activities",
        "source": "eventsactivities/nowthen20251975.html",
        "destination": "src/events/now-and-then-2025.njk",
        "slug": "now-and-then-2025",
        "eyebrow": "Past event",
        "kind": "event",
        "section": "events",
        "order": 30,
    },
    {
        "work": "events-activities",
        "source": "eventsactivities/trcoeexhibit.html",
        "destination": "src/events/theodore-roosevelt-henry-waldo-coe-exhibit.njk",
        "slug": "theodore-roosevelt-henry-waldo-coe-exhibit",
        "eyebrow": "Past exhibit",
        "kind": "exhibit",
        "section": "events",
        "order": 40,
    },
    {
        "work": "events-activities",
        "source": "eventsactivities/wwiiexhibit.html",
        "destination": "src/events/world-war-ii-exhibit.njk",
        "slug": "world-war-ii-exhibit",
        "eyebrow": "Past exhibit",
        "kind": "exhibit",
        "section": "events",
        "order": 50,
    },
)


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


for config in PAGES:
    work = ROOT / "archive/work" / config["work"]
    source_path = work / config["source"]
    asset_source = work / "images"
    destination = ROOT / config["destination"]
    slug = config["slug"]

    manifest = json.loads((work / "manifest.json").read_text(encoding="utf-8"))
    capture = next(item for item in manifest if item["path"] == config["source"])
    soup = BeautifulSoup(source_path.read_bytes().decode("cp1252"), "html.parser")
    blocks = soup.select("#content .building_block")
    title = normalize(blocks[0].get_text())
    content_blocks = blocks[1:]

    destination_images = IMAGE_DESTINATION / slug
    destination_documents = DOCUMENT_DESTINATION / slug
    destination_images.mkdir(parents=True, exist_ok=True)
    destination_documents.mkdir(parents=True, exist_ok=True)
    used_names: dict[str, int] = {}
    copied_sources = set()
    figures_by_block = []
    links_by_block = []
    all_figures = []
    for block in content_blocks:
        figures = []
        for image in block.select('img[src*="images/"]'):
            if "/photoalbum/" in image["src"]:
                continue
            source_asset = asset_source / Path(image["src"]).name
            if not source_asset.exists():
                print(f"Missing captured image referenced by {slug}: {image['src']}")
                continue
            copied_sources.add(source_asset.name)
            name = asset_name(source_asset.name)
            if name in used_names:
                used_names[name] += 1
                name = f"{Path(name).stem}-{used_names[name]}{Path(name).suffix}"
            else:
                used_names[name] = 1
            shutil.copyfile(source_asset, destination_images / name)
            public_path = f"/assets/images/miscellaneous/{slug}/{name}"
            figures.append(public_path)
            all_figures.append(public_path)

        for slideshow_path in re.findall(
            r"olpath:\s*['\"]([^'\"]+)", str(block)
        ):
            source_asset = asset_source / Path(slideshow_path).name
            if (
                not source_asset.exists()
                or source_asset.name in copied_sources
            ):
                continue
            copied_sources.add(source_asset.name)
            name = asset_name(source_asset.name)
            if name in used_names:
                used_names[name] += 1
                name = f"{Path(name).stem}-{used_names[name]}{Path(name).suffix}"
            else:
                used_names[name] = 1
            shutil.copyfile(source_asset, destination_images / name)
            public_path = f"/assets/images/miscellaneous/{slug}/{name}"
            figures.append(public_path)
            all_figures.append(public_path)
        figures_by_block.append(figures)

        links = []
        seen_links = set()
        for link in block.select("a[href]"):
            label = normalize(link.get_text())
            href = link["href"]
            if href in {"#", "javascript://"}:
                continue
            if "images/" in href:
                source_asset = asset_source / Path(href).name
                if source_asset.exists():
                    name = asset_name(source_asset.name)
                    shutil.copyfile(source_asset, destination_documents / name)
                    href = f"/assets/documents/{slug}/{name}"
                    if not label:
                        label = source_asset.stem.replace("_", " ")
            if not label or (label, href) in seen_links:
                continue
            seen_links.add((label, href))
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
        f"eyebrow: {yaml_string(config['eyebrow'])}",
        f"description: {yaml_string(summary(description))}",
        f"id: {slug}",
        f"kind: {config['kind']}",
        f"section: {config['section']}",
        f"order: {config['order']}",
        "tags: records",
        f"legacyUrl: {capture['url']}",
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

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        "\n".join(front_matter + body).rstrip() + "\n", encoding="utf-8"
    )
    print(f"Migrated {config['source']} -> {config['destination']}")
