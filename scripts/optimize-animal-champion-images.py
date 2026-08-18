#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

REPO_ROOT = Path(__file__).resolve().parent.parent
ANIMAL_CHAMPION_DIR = REPO_ROOT / "public" / "Games" / "Animal Champion"
ANIMALS_DIR = ANIMAL_CHAMPION_DIR / "Animals"
MANIFEST_PATH = ANIMAL_CHAMPION_DIR / "animals-manifest.json"
THUMBNAILS_DIR = REPO_ROOT / "public" / "assets" / "thumbnails" / "optimized"

OUTPUT_EXTENSION = ".webp"
PRIMARY_QUALITY = 82
FALLBACK_QUALITY = 76
MAX_TARGET_BYTES = int(1.5 * 1024 * 1024)
WEBP_METHOD = 6

PRESET_SIZES = {
    "animal": (853, 1280),
    "wallpaper": (1536, 1024),
    "thumb": (1024, 1024),
    "catalog-thumb": (128, 128),
}


def format_bytes(value: int) -> str:
    return f"{value / (1024 * 1024):.2f} MB"


def iter_animal_dirs() -> list[Path]:
    if not ANIMALS_DIR.is_dir():
        return []
    return sorted(
        (path for path in ANIMALS_DIR.iterdir() if path.is_dir()),
        key=lambda path: path.name.casefold(),
    )


def animal_manifest_entries() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for animal_dir in iter_animal_dirs():
        images = sorted(
            (
                image_path.relative_to(ANIMAL_CHAMPION_DIR).as_posix()
                for image_path in animal_dir.rglob("*")
                if image_path.is_file() and image_path.suffix.lower() == OUTPUT_EXTENSION
            ),
            key=str.casefold,
        )
        entries.append(
            {
                "name": animal_dir.name,
                "folder": animal_dir.relative_to(ANIMAL_CHAMPION_DIR).as_posix(),
                "images": images,
            }
        )
    return entries


def prepare_canvas(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    normalized = ImageOps.exif_transpose(image).convert("RGB")
    if normalized.size[0] * size[1] == normalized.size[1] * size[0]:
        return normalized.resize(size, Image.Resampling.LANCZOS)

    backdrop = ImageOps.fit(normalized, size, Image.Resampling.LANCZOS)
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(radius=max(size) / 40))
    backdrop = ImageEnhance.Brightness(backdrop).enhance(0.55)
    foreground = ImageOps.contain(normalized, size, Image.Resampling.LANCZOS)
    left = (size[0] - foreground.width) // 2
    top = (size[1] - foreground.height) // 2
    backdrop.paste(foreground, (left, top))
    return backdrop


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


def allowed_destination(destination: Path) -> Path:
    resolved = destination.resolve()
    allowed_roots = (ANIMAL_CHAMPION_DIR.resolve(), THUMBNAILS_DIR.resolve())
    if not any(
        resolved == root or root in resolved.parents
        for root in allowed_roots
    ):
        allowed = ", ".join(str(root) for root in allowed_roots)
        raise ValueError(f"Output must be inside one of: {allowed}")
    if resolved.suffix.lower() != OUTPUT_EXTENSION:
        raise ValueError(f"Output must be a WebP path: {resolved}")
    if not resolved.parent.is_dir():
        raise FileNotFoundError(f"Output directory not found: {resolved.parent}")
    return resolved


def import_source(source_path: Path, destination: Path, preset: str) -> None:
    source_path = source_path.expanduser().resolve()
    if not source_path.is_file():
        raise FileNotFoundError(f"Source image not found: {source_path}")

    destination = allowed_destination(destination)
    if destination.exists():
        raise FileExistsError(f"Refusing to overwrite existing asset: {destination}")

    temp_path = destination.with_name(f".{destination.name}.tmp")
    try:
        with Image.open(source_path) as opened_image:
            opened_image.load()
            prepared = prepare_canvas(opened_image, PRESET_SIZES[preset])

        final_quality = PRIMARY_QUALITY
        for quality in (PRIMARY_QUALITY, FALLBACK_QUALITY):
            final_quality = quality
            if temp_path.exists():
                temp_path.unlink()
            save_webp(prepared, temp_path, quality)
            verify_image(temp_path)
            if temp_path.stat().st_size <= MAX_TARGET_BYTES or quality == FALLBACK_QUALITY:
                break

        if destination.exists():
            raise FileExistsError(f"Refusing to overwrite existing asset: {destination}")
        temp_path.replace(destination)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    print(
        f"Imported {source_path} -> {destination} "
        f"({PRESET_SIZES[preset][0]}x{PRESET_SIZES[preset][1]}, quality {final_quality})"
    )


def write_manifest(entries: list[dict[str, object]]) -> None:
    MANIFEST_PATH.write_text(f"{json.dumps(entries, indent=2)}\n", encoding="utf-8")


def refresh_manifest() -> int:
    entries = animal_manifest_entries()
    write_manifest(entries)
    image_count = sum(len(entry["images"]) for entry in entries)
    print(f"Refreshed manifest for {len(entries)} animals and {image_count} WebPs.")
    return 0


def read_manifest() -> list[dict[str, object]]:
    with MANIFEST_PATH.open("r", encoding="utf-8") as manifest_file:
        manifest = json.load(manifest_file)
    if not isinstance(manifest, list):
        raise ValueError("Manifest must contain a list of animal entries")
    return manifest


def check_assets() -> int:
    if not ANIMALS_DIR.is_dir():
        raise FileNotFoundError(f"Animal assets directory not found: {ANIMALS_DIR}")

    expected_entries = animal_manifest_entries()
    manifest_entries = read_manifest()
    if manifest_entries != expected_entries:
        raise RuntimeError("Manifest/disk difference detected")

    animal_count = len(expected_entries)
    image_count = 0
    for entry in expected_entries:
        images = entry["images"]
        if not isinstance(images, list) or len(images) < 2:
            raise RuntimeError(f"Animal {entry['name']} does not have at least two images")
        for relative_image in images:
            image_path = ANIMAL_CHAMPION_DIR / str(relative_image)
            try:
                verify_image(image_path)
            except Exception as error:
                raise RuntimeError(f"Unable to decode {relative_image}: {error}") from error
            image_count += 1
            image_size = image_path.stat().st_size
            if image_size > MAX_TARGET_BYTES:
                raise RuntimeError(
                    f"Image over 1.5 MiB: {relative_image} ({format_bytes(image_size)})"
                )

    print(f"Checked {animal_count} animals and {image_count} WebPs; manifest and disk agree.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument("--import-source", type=Path)
    actions.add_argument("--refresh-manifest", action="store_true")
    actions.add_argument("--check", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--preset", choices=sorted(PRESET_SIZES))
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.import_source is not None:
            if args.output is None or args.preset is None:
                parser.error("--import-source requires both --output and --preset")
            import_source(args.import_source, args.output, args.preset)
            return 0
        if args.refresh_manifest:
            return refresh_manifest()
        return check_assets()
    except (FileExistsError, FileNotFoundError, RuntimeError, ValueError, OSError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
