#!/usr/bin/env python3
"""Extract one captured site section and its directly referenced resources."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import shutil
import tempfile
import urllib.parse
import zipfile
from pathlib import Path, PurePosixPath


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--section", required=True, help="URL path prefix")
    return parser.parse_args()


def iter_cdx(inner: zipfile.ZipFile):
    with inner.open("indexes/index.cdx.gz") as compressed:
        with gzip.open(compressed, "rt", encoding="utf-8") as lines:
            for line in lines:
                _, timestamp, payload = line.rstrip().split(" ", 2)
                record = json.loads(payload)
                record["timestamp"] = timestamp
                yield record


def is_section_record(record: dict, section: str) -> bool:
    url = urllib.parse.urlsplit(record["url"])
    path = url.path.lstrip("/")
    if path == section.rstrip("/") or path.startswith(section):
        return True

    referrer = record.get("referrer")
    if not referrer:
        return False
    referrer_path = urllib.parse.urlsplit(referrer).path.lstrip("/")
    return referrer_path.startswith(section)


def safe_output_path(url: str) -> PurePosixPath:
    path = urllib.parse.urlsplit(url).path.lstrip("/")
    candidate = PurePosixPath(path)
    if not path or candidate.is_absolute() or ".." in candidate.parts:
        raise ValueError(f"Unsafe or empty captured path: {url}")
    return candidate


def split_headers(payload: bytes) -> tuple[dict[str, str], bytes]:
    separator = b"\r\n\r\n"
    head, found, body = payload.partition(separator)
    if not found:
        head, found, body = payload.partition(b"\n\n")
    headers = {}
    for line in head.decode("iso-8859-1").splitlines()[1:]:
        if ":" in line:
            name, value = line.split(":", 1)
            headers[name.lower()] = value.strip()
    return headers, body


def decode_chunked(body: bytes) -> bytes:
    decoded = bytearray()
    while body:
        size_line, _, body = body.partition(b"\r\n")
        size = int(size_line.split(b";", 1)[0], 16)
        if size == 0:
            break
        decoded.extend(body[:size])
        body = body[size + 2 :]
    return bytes(decoded)


def extract_payload(warc: bytes, offset: int, length: int) -> bytes:
    record = gzip.decompress(warc[offset : offset + length])
    _, http_message = split_headers(record)
    headers, body = split_headers(http_message)
    if headers.get("transfer-encoding", "").lower() == "chunked":
        body = decode_chunked(body)
    if headers.get("content-encoding", "").lower() == "gzip":
        body = gzip.decompress(body)
    elif "content-length" in headers:
        body = body[: int(headers["content-length"])]
    return body


def main() -> None:
    args = parse_args()
    section = args.section.lstrip("/")
    if not section.endswith("/"):
        section += "/"

    selected: dict[str, tuple[str, dict]] = {}
    with tempfile.TemporaryDirectory(prefix="wacz-section-") as temporary:
        temporary_path = Path(temporary)
        with zipfile.ZipFile(args.archive) as outer:
            nested_names = sorted(
                name for name in outer.namelist() if name.lower().endswith(".wacz")
            )
            for nested_name in nested_names:
                nested_path = temporary_path / Path(nested_name).name
                with outer.open(nested_name) as source, nested_path.open("wb") as target:
                    shutil.copyfileobj(source, target)
                with zipfile.ZipFile(nested_path) as inner:
                    for record in iter_cdx(inner):
                        if (
                            record.get("status") == "200"
                            and record.get("mime") != "warc/revisit"
                            and is_section_record(record, section)
                        ):
                            selected.setdefault(record["url"], (nested_path.name, record))

        warc_cache: dict[tuple[str, str], bytes] = {}
        manifest = []
        args.output.mkdir(parents=True, exist_ok=True)
        for url, (nested_name, record) in sorted(selected.items()):
            nested_path = temporary_path / nested_name
            cache_key = (nested_name, record["filename"])
            if cache_key not in warc_cache:
                with zipfile.ZipFile(nested_path) as inner:
                    warc_cache[cache_key] = inner.read(
                        f"archive/{record['filename']}"
                    )
            body = extract_payload(
                warc_cache[cache_key],
                int(record["offset"]),
                int(record["length"]),
            )
            relative_path = safe_output_path(url)
            destination = args.output.joinpath(*relative_path.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(body)
            manifest.append(
                {
                    "url": url,
                    "path": relative_path.as_posix(),
                    "timestamp": record["timestamp"],
                    "mime": record["mime"],
                    "sha256": hashlib.sha256(body).hexdigest(),
                    "referrer": record.get("referrer"),
                }
            )

    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Extracted {len(manifest)} records to {args.output}")


if __name__ == "__main__":
    main()
