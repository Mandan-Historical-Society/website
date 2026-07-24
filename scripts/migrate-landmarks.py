#!/usr/bin/env python3
"""Create faithful first-pass Eleventy landmark records from extracted WACZ data."""

from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "archive/work/landmarks"
SOURCE = WORK / "arealandmarks"
IMAGE_SOURCE = WORK / "images"
PAGE_DESTINATION = ROOT / "src/places/landmarks"
IMAGE_DESTINATION = ROOT / "src/assets/images/landmarks"

SLUGS = {
    "2ndlibertymemrlbridge": "liberty-memorial-bridge",
    "carybldgmandandrug": "l-n-cary-building",
    "christthekingchurch": "christ-the-king-church",
    "collinsavcivicbldg": "collins-avenue-civic-building",
    "firstlutheranchurch": "first-lutheran-church",
    "firstnationalbankbldg": "first-national-bank-building",
    "firstpresbyterianchurch": "first-presbyterian-church",
    "greatplainsacademy": "great-plains-academy",
    "greatplainsexpermtstn": "northern-great-plains-experiment-station",
    "lewisclarkhotel": "lewis-and-clark-hotel",
    "mandanhill": "mandans-crying-hill",
    "mandantheatre": "mandan-theatre",
    "methodistchurch": "methodist-church",
    "missvalleygrocerywarehs": "missouri-valley-grocery-warehouse",
    "npbeanery": "northern-pacific-beanery",
    "npcolonialrrdepot": "northern-pacific-colonial-depot",
    "nprailhighbridge": "northern-pacific-high-bridge",
    "npryfreighthouse": "northern-pacific-freight-house",
    "roughriderstatue": "rough-rider-statue",
    "stjosephchurch": "saint-joseph-church",
    "whisperinggiantstatue": "whispering-giant-statue",
    "wwarmemorialbldg": "mandan-memorial-building",
    "youthcorrectionalcenter": "youth-correctional-center",
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def asset_name(source_name: str) -> str:
    stem = Path(source_name).stem
    suffix = Path(source_name).suffix.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
    return normalized + suffix


def yaml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


manifest = {
    item["url"]: item
    for item in json.loads((WORK / "manifest.json").read_text(encoding="utf-8"))
}

for order, source_path in enumerate(sorted(SOURCE.glob("*.html")), start=1):
    legacy_name = source_path.stem
    slug = SLUGS[legacy_name]
    if slug == "collins-avenue-civic-building":
        continue

    source_url = f"http://www.mandanhistory.org/arealandmarks/{legacy_name}.html"
    capture = manifest[source_url]
    soup = BeautifulSoup(source_path.read_bytes().decode("cp1252"), "html.parser")
    blocks = soup.select("#content .building_block")
    title = normalize_text(blocks[0].get_text()) if blocks else legacy_name
    content_blocks = blocks[1:]

    destination_images = IMAGE_DESTINATION / slug
    destination_images.mkdir(parents=True, exist_ok=True)
    used_names: dict[str, int] = {}
    figures_by_block: list[list[str]] = []
    all_figures: list[str] = []
    for block in content_blocks:
        block_figures = []
        for image in block.select('img[src*="../images/"]'):
            source_name = Path(image["src"]).name
            source_image = IMAGE_SOURCE / source_name
            if not source_image.exists():
                print(f"Missing captured image referenced by {legacy_name}: {source_name}")
                continue
            name = asset_name(source_name)
            if name in used_names:
                used_names[name] += 1
                name = f"{Path(name).stem}-{used_names[name]}{Path(name).suffix}"
            else:
                used_names[name] = 1
            shutil.copyfile(source_image, destination_images / name)
            public_path = f"/assets/images/landmarks/{slug}/{name}"
            block_figures.append(public_path)
            all_figures.append(public_path)
        figures_by_block.append(block_figures)

    paragraphs = [normalize_text(block.get_text()) for block in content_blocks]
    description = next((text for text in paragraphs if len(text) >= 100), title)
    first_sentence = re.split(r"(?<=[.!?])\s+", description, maxsplit=1)[0]
    address_match = re.search(
        r"\b\d{1,4}\s+(?:[A-Za-z0-9'-]+\s+){0,4}(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard)\b[^,.;]*",
        title,
        re.IGNORECASE,
    )
    address = address_match.group(0) if address_match else ""
    card_title = re.split(r"\s+-\s+|\s+\d{1,4}\s", title, maxsplit=1)[0]
    card_image = all_figures[0] if all_figures else ""

    front_matter = [
        "---",
        "layout: layouts/page.njk",
        f"title: {yaml_string(title)}",
        "eyebrow: Landmark",
        f"description: {yaml_string(first_sentence)}",
        f"id: {slug}",
        "kind: place",
        "section: landmarks",
        f"order: {order * 10}",
        "tags: records",
    ]
    if address:
        front_matter.append(f"address: {yaml_string(address + ', Mandan, ND')}")
    front_matter.extend(
        [
            "place:",
            "  status: standing",
            "  collection: landmarks",
            "  latitude:",
            "  longitude:",
            f"legacyUrl: {source_url}",
            "sourceFile: archive/source/mandanhistory-org.wacz",
            f"capturedAt: {capture['timestamp'][0:4]}-{capture['timestamp'][4:6]}-{capture['timestamp'][6:8]}T{capture['timestamp'][8:10]}:{capture['timestamp'][10:12]}:{capture['timestamp'][12:14]}Z",
            "card:",
            f"  title: {yaml_string(card_title)}",
            f"  meta: {yaml_string(address)}",
            f"  image: {card_image}",
            f"  imageAlt: {yaml_string('Historic image from the ' + card_title + ' page')}",
            "---",
        ]
    )

    body = []
    for paragraph, figures in zip(paragraphs, figures_by_block):
        if figures:
            body.append('<div class="image-gallery">')
            for public_path in figures:
                body.extend(
                    [
                        "  <figure>",
                        f'    <img src="{public_path}" alt="{html.escape("Historic image from the " + card_title + " page", quote=True)}">',
                        "  </figure>",
                    ]
                )
            body.append("</div>")
            body.append("")
        if paragraph:
            body.append(f"<p>{html.escape(paragraph, quote=False)}</p>")
            body.append("")

    output = "\n".join(front_matter + body).rstrip() + "\n"
    (PAGE_DESTINATION / f"{slug}.njk").write_text(output, encoding="utf-8")
    print(f"Migrated {legacy_name} -> {slug}")
