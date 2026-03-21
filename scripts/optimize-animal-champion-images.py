#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

REPO_ROOT = Path(__file__).resolve().parent.parent
ANIMAL_CHAMPION_DIR = REPO_ROOT / "public" / "Games" / "Animal Champion"
ANIMALS_DIR = ANIMAL_CHAMPION_DIR / "Animals"
MANIFEST_PATH = ANIMAL_CHAMPION_DIR / "animals-manifest.json"

SOURCE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
OUTPUT_EXTENSION = ".webp"
MAX_LONG_EDGE = 1280
PRIMARY_QUALITY = 82
FALLBACK_QUALITY = 76
MAX_TARGET_BYTES = int(1.5 * 1024 * 1024)
WEBP_METHOD = 6


def format_bytes(value: int) -> str:
    return f"{value / (1024 * 1024):.2f} MB"


def iter_source_images() -> list[Path]:
    return sorted(
        path for path in ANIMALS_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in SOURCE_EXTENSIONS
    )


def iter_animal_dirs() -> list[Path]:
    return sorted(
        (path for path in ANIMALS_DIR.iterdir() if path.is_dir()),
        key=lambda path: path.name.casefold(),
    )


def has_alpha_channel(image: Image.Image) -> bool:
    return "A" in image.getbands() or image.info.get("transparency") is not None


def resize_for_delivery(image: Image.Image) -> Image.Image:
    width, height = image.size
    long_edge = max(width, height)
    if long_edge <= MAX_LONG_EDGE:
        return image.copy()

    scale = MAX_LONG_EDGE / long_edge
    new_size = (
        max(1, int(round(width * scale))),
        max(1, int(round(height * scale))),
    )
    return image.resize(new_size, Image.Resampling.LANCZOS)


def save_webp(image: Image.Image, output_path: Path, quality: int) -> None:
    image.save(
        output_path,
        format="WEBP",
        quality=quality,
        method=WEBP_METHOD,
    )


def verify_image(path: Path) -> None:
    with Image.open(path) as image:
        image.load()


def convert_image(source_path: Path) -> dict[str, object]:
    output_path = source_path.with_suffix(OUTPUT_EXTENSION)
    temp_path = output_path.with_name(f"{output_path.stem}.tmp{OUTPUT_EXTENSION}")
    source_size = source_path.stat().st_size

    with Image.open(source_path) as opened_image:
        opened_image.load()
        normalized_image = ImageOps.exif_transpose(opened_image)
        if has_alpha_channel(normalized_image):
            prepared_image = normalized_image.convert("RGBA")
        else:
            prepared_image = normalized_image.convert("RGB")

        resized_image = resize_for_delivery(prepared_image)
        original_size = prepared_image.size
        final_quality = PRIMARY_QUALITY

        for quality in (PRIMARY_QUALITY, FALLBACK_QUALITY):
            final_quality = quality
            if temp_path.exists():
                temp_path.unlink()
            save_webp(resized_image, temp_path, quality)
            verify_image(temp_path)
            if temp_path.stat().st_size <= MAX_TARGET_BYTES or quality == FALLBACK_QUALITY:
                break

    temp_path.replace(output_path)
    if source_path.exists():
        source_path.unlink()

    output_size = output_path.stat().st_size
    relative_output = output_path.relative_to(ANIMAL_CHAMPION_DIR).as_posix()
    return {
        "source": source_path.relative_to(ANIMAL_CHAMPION_DIR).as_posix(),
        "output": relative_output,
        "source_size": source_size,
        "output_size": output_size,
        "quality": final_quality,
        "resized": original_size != resized_image.size,
        "dimensions": resized_image.size,
    }


def build_manifest() -> list[dict[str, object]]:
    manifest_entries: list[dict[str, object]] = []
    for animal_dir in iter_animal_dirs():
        images = sorted(
            (
                image_path.relative_to(ANIMAL_CHAMPION_DIR).as_posix()
                for image_path in animal_dir.iterdir()
                if image_path.is_file() and image_path.suffix.lower() == OUTPUT_EXTENSION
            ),
            key=str.casefold,
        )
        if not images:
            raise RuntimeError(f"No WebP images found for {animal_dir.relative_to(ANIMAL_CHAMPION_DIR).as_posix()}")

        manifest_entries.append(
            {
                "name": animal_dir.name,
                "folder": animal_dir.relative_to(ANIMAL_CHAMPION_DIR).as_posix(),
                "images": images,
            }
        )

    return manifest_entries


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_PATH.write_text(f"{json.dumps(entries, indent=2)}\n", encoding="utf-8")


def main() -> int:
    if not ANIMALS_DIR.exists():
        print(f"Animal assets directory not found: {ANIMALS_DIR}", file=sys.stderr)
        return 1

    source_images = iter_source_images()
    converted_images: list[dict[str, object]] = []
    for source_path in source_images:
        converted_images.append(convert_image(source_path))

    manifest_entries = build_manifest()
    write_manifest(manifest_entries)

    total_output_files = sum(len(entry["images"]) for entry in manifest_entries)
    total_output_size = sum(
        image_path.stat().st_size
        for animal_dir in iter_animal_dirs()
        for image_path in animal_dir.iterdir()
        if image_path.is_file() and image_path.suffix.lower() == OUTPUT_EXTENSION
    )
    converted_output_size = sum(int(result["output_size"]) for result in converted_images)
    oversized_outputs = [
        result for result in converted_images
        if int(result["output_size"]) > MAX_TARGET_BYTES
    ]

    original_total_size = sum(int(result["source_size"]) for result in converted_images)
    space_saved = original_total_size - converted_output_size

    print(f"Converted {len(converted_images)} source images to WebP.")
    print(f"Animal Champion delivery set: {total_output_files} WebP files.")
    if not converted_images:
        print("No source PNG/JPG files found; manifest refreshed from existing WebP files.")
    print(f"Original size: {format_bytes(original_total_size)}")
    print(f"Optimized size: {format_bytes(total_output_size)}")
    print(f"Saved: {format_bytes(space_saved)}")
    print(f"Manifest: {MANIFEST_PATH.relative_to(REPO_ROOT).as_posix()}")

    if oversized_outputs:
        print("\nRemaining files over 1.5 MB after fallback quality:")
        for result in oversized_outputs:
            print(f"- {result['output']} ({format_bytes(int(result['output_size']))}, quality {result['quality']})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
