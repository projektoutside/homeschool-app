#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_OUTPUT_BYTES = 1_500_000
WEBP_METHOD = 6
OPAQUE_QUALITY = 90


def normalized_image(source: Path) -> Image.Image:
    with Image.open(source) as opened:
        opened.load()
        transposed = ImageOps.exif_transpose(opened)
        has_alpha = "A" in transposed.getbands() or (
            transposed.mode == "P" and "transparency" in transposed.info
        )
        return transposed.convert("RGBA" if has_alpha else "RGB")


def pad_atlas(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        raise ValueError("Atlas mode requires a source image with an alpha channel")

    target_width = ((image.width + 3) // 4) * 4
    target_height = ((image.height + 3) // 4) * 4
    if image.size == (target_width, target_height):
        return image

    padded = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    padded.alpha_composite(
        image,
        ((target_width - image.width) // 2, (target_height - image.height) // 2),
    )
    image.close()
    return padded


def optimize_image(input_path: Path, output_path: Path, mode: str) -> None:
    source = input_path.expanduser().resolve()
    destination = output_path.expanduser().resolve()

    if not source.is_file():
        raise FileNotFoundError(f"Input image not found: {source}")
    if source == destination:
        raise ValueError("Output must not overwrite the input image")
    if destination.suffix.lower() != ".webp":
        raise ValueError(f"Output must use the .webp extension: {destination}")
    if destination.exists():
        raise FileExistsError(f"Refusing to overwrite existing output: {destination}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.tmp")
    if temporary.exists():
        temporary.unlink()

    image = normalized_image(source)
    if mode == "atlas":
        image = pad_atlas(image)
    save_options: dict[str, object] = {
        "format": "WEBP",
        "method": WEBP_METHOD,
        "exact": True,
    }
    if mode in {"atlas", "lossless"}:
        save_options.update(lossless=True, quality=100)
    else:
        save_options.update(lossless=False, quality=OPAQUE_QUALITY)

    try:
        image.save(temporary, **save_options)
        output_size = temporary.stat().st_size
        if output_size >= MAX_OUTPUT_BYTES:
            raise RuntimeError(
                f"Optimized output is {output_size} bytes; it must be under {MAX_OUTPUT_BYTES} bytes"
            )

        with Image.open(temporary) as verified:
            verified.load()
            if verified.size != image.size:
                raise RuntimeError(
                    f"Output dimensions changed from {image.size} to {verified.size}"
                )
            if "A" in image.getbands() and "A" not in verified.getbands():
                raise RuntimeError("Output lost the source alpha channel")

        if destination.exists():
            raise FileExistsError(f"Refusing to overwrite existing output: {destination}")
        os.replace(temporary, destination)
    finally:
        image.close()
        if temporary.exists():
            temporary.unlink()

    print(
        f"Optimized {source} -> {destination} "
        f"({mode}, {destination.stat().st_size} bytes)"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Deterministically optimize Defender Champion raster assets as WebP."
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mode", choices=("atlas", "lossless", "opaque"), required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        optimize_image(args.input, args.output, args.mode)
        return 0
    except (FileExistsError, FileNotFoundError, OSError, RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
