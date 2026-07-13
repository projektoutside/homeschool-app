#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps

REPO_ROOT = Path(__file__).resolve().parent.parent
CAR_IMAGES_DIR = REPO_ROOT / "public" / "Games" / "CarKingFinal" / "assets" / "cars"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_LONG_EDGE = 2560
JPEG_QUALITY = 85


def iter_images() -> list[Path]:
    return sorted(
        path
        for path in CAR_IMAGES_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def oversized_images() -> list[tuple[Path, tuple[int, int]]]:
    findings: list[tuple[Path, tuple[int, int]]] = []
    for path in iter_images():
        with Image.open(path) as image:
            if max(image.size) > MAX_LONG_EDGE:
                findings.append((path, image.size))
    return findings


def optimize_image(path: Path) -> None:
    temp_path = path.with_name(f"{path.stem}.optimized{path.suffix}")
    with Image.open(path) as opened_image:
        opened_image.load()
        image = ImageOps.exif_transpose(opened_image)
        scale = MAX_LONG_EDGE / max(image.size)
        target_size = (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        )
        resized = image.resize(target_size, Image.Resampling.LANCZOS)

        if path.suffix.lower() in {".jpg", ".jpeg"}:
            resized.convert("RGB").save(
                temp_path,
                format="JPEG",
                quality=JPEG_QUALITY,
                optimize=True,
                progressive=True,
            )
        else:
            resized.save(temp_path, format="PNG", optimize=True)

    with Image.open(temp_path) as verification:
        verification.load()
        if max(verification.size) > MAX_LONG_EDGE:
            raise RuntimeError(f"Optimized image still exceeds budget: {path}")

    temp_path.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit or optimize Car King gameplay images.")
    parser.add_argument("--optimize", action="store_true", help="Resize oversized images in place.")
    args = parser.parse_args()

    if not CAR_IMAGES_DIR.exists():
        print(f"Car King image directory not found: {CAR_IMAGES_DIR}", file=sys.stderr)
        return 1

    findings = oversized_images()
    if args.optimize:
        before_bytes = sum(path.stat().st_size for path, _ in findings)
        for path, _ in findings:
            optimize_image(path)
        after_bytes = sum(path.stat().st_size for path, _ in findings)
        print(
            f"Optimized {len(findings)} Car King images; "
            f"saved {(before_bytes - after_bytes) / (1024 * 1024):.2f} MB."
        )
        findings = oversized_images()

    if findings:
        print(f"Car King images over the {MAX_LONG_EDGE}px long-edge budget:", file=sys.stderr)
        for path, size in findings:
            relative = path.relative_to(REPO_ROOT).as_posix()
            print(f"- {relative}: {size[0]}x{size[1]}", file=sys.stderr)
        return 1

    print(f"Car King image budget passed ({MAX_LONG_EDGE}px maximum long edge).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
