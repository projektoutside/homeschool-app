#!/usr/bin/env python3

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

MAX_OUTPUT_BYTES = 1_500_000
WEBP_METHOD = 6
OPAQUE_QUALITY = 90
ATLAS_COLUMNS = 4
ATLAS_ROWS = 4
PATH_LANE_WIDTH = 128
SPRITE_SAFE_INSET = 24
CASTLE_FRAME_COUNT = 4
CASTLE_ANCHOR_X = 271
CASTLE_GROUND_CONTACT_Y = 672
PATH_CONNECTIONS = (
    (),
    ("east", "west"),
    ("north", "south"),
    ("north", "east", "south", "west"),
    ("north", "east"),
    ("east", "south"),
    ("south", "west"),
    ("west", "north"),
    ("north", "east", "south"),
    ("east", "south", "west"),
    ("south", "west", "north"),
    ("west", "north", "east"),
    ("north",),
    ("east",),
    ("south",),
    ("west",),
)


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


def threshold_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    result = mask.getbbox()
    mask.close()
    alpha.close()
    return result


def remove_low_alpha(image: Image.Image, cutoff: int = 8) -> Image.Image:
    cleaned = image.copy()
    alpha = cleaned.getchannel("A").point(lambda value: 0 if value <= cutoff else value)
    cleaned.putalpha(alpha)
    return cleaned


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    width, height = image.size
    alpha = bytearray(image.getchannel("A").tobytes())
    visited = bytearray(width * height)
    largest: list[int] = []

    for start, value in enumerate(alpha):
        if value == 0 or visited[start]:
            continue
        visited[start] = 1
        stack = [start]
        component: list[int] = []
        while stack:
            point = stack.pop()
            component.append(point)
            x = point % width
            y = point // width
            for neighbor in (
                point - 1 if x else -1,
                point + 1 if x + 1 < width else -1,
                point - width if y else -1,
                point + width if y + 1 < height else -1,
            ):
                if neighbor >= 0 and not visited[neighbor] and alpha[neighbor] > 0:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        if len(component) > len(largest):
            largest = component

    cleaned = image.copy()
    kept = bytearray(width * height)
    for point in largest:
        kept[point] = alpha[point]
    cleaned.putalpha(Image.frombytes("L", (width, height), bytes(kept)))
    return cleaned


def canonical_path_mask(
    size: tuple[int, int],
    connections: tuple[str, ...],
    isolated: bool,
) -> Image.Image:
    width, height = size
    supersample = 4
    large = Image.new("L", (width * supersample, height * supersample), 0)
    draw = ImageDraw.Draw(large)

    def box(left: int, top: int, right: int, bottom: int) -> tuple[int, int, int, int]:
        return (
            left * supersample,
            top * supersample,
            (right * supersample) - 1,
            (bottom * supersample) - 1,
        )

    lane_start = (width - PATH_LANE_WIDTH) // 2
    lane_end = lane_start + PATH_LANE_WIDTH
    center_start = 68
    center_end = width - center_start
    if isolated:
        draw.rounded_rectangle(box(40, 40, width - 40, height - 40), radius=38 * supersample, fill=255)
    else:
        if len(connections) == 1:
            draw.ellipse(box(center_start, center_start, center_end, center_end), fill=255)
        else:
            draw.ellipse(box(lane_start, lane_start, lane_end, lane_end), fill=255)
        if "north" in connections:
            draw.rectangle(box(lane_start, 0, lane_end, (height + 1) // 2), fill=255)
        if "east" in connections:
            draw.rectangle(box((width - 1) // 2, lane_start, width, lane_end), fill=255)
        if "south" in connections:
            draw.rectangle(box(lane_start, (height - 1) // 2, lane_end, height), fill=255)
        if "west" in connections:
            draw.rectangle(box(0, lane_start, (width + 1) // 2, lane_end), fill=255)

    mask = large.resize(size, Image.Resampling.LANCZOS)
    large.close()
    pixels = mask.load()
    expected_start = lane_start
    expected_end = lane_end
    for x in range(width):
        pixels[x, 0] = 255 if "north" in connections and expected_start <= x < expected_end else 0
        pixels[x, height - 1] = 255 if "south" in connections and expected_start <= x < expected_end else 0
    for y in range(height):
        pixels[0, y] = 255 if "west" in connections and expected_start <= y < expected_end else 0
        pixels[width - 1, y] = 255 if "east" in connections and expected_start <= y < expected_end else 0
    return mask


def average_dark_path_color(image: Image.Image) -> tuple[int, int, int, int]:
    raw = image.tobytes()
    opaque = [tuple(raw[index:index + 3]) for index in range(0, len(raw), 4) if raw[index + 3] > 160]
    if not opaque:
        raise ValueError("Path texture contains no opaque pixels")
    opaque.sort(key=sum)
    sample = opaque[: max(1, len(opaque) // 5)]
    return tuple(sum(pixel[channel] for pixel in sample) // len(sample) for channel in range(3)) + (255,)


def render_canonical_path_cell(
    source: Image.Image,
    fallback_texture: Image.Image,
    connections: tuple[str, ...],
    isolated: bool,
) -> Image.Image:
    mask = canonical_path_mask(source.size, connections, isolated)
    inner_mask = mask.filter(ImageFilter.MinFilter(11))
    border_color = average_dark_path_color(source)
    rendered = Image.new("RGBA", source.size, border_color)
    rendered.putalpha(mask)

    texture = fallback_texture.copy()
    texture.putalpha(inner_mask)
    rendered.alpha_composite(texture)
    rendered.putalpha(mask)

    texture.close()
    inner_mask.close()
    mask.close()
    return keep_largest_alpha_component(rendered)


def normalize_path_atlas(image: Image.Image) -> Image.Image:
    atlas = pad_atlas(image)
    frame_width = atlas.width // ATLAS_COLUMNS
    frame_height = atlas.height // ATLAS_ROWS
    if (frame_width, frame_height) != (314, 314):
        raise ValueError(f"Path atlas frames must be 314x314, got {frame_width}x{frame_height}")
    normalized = Image.new("RGBA", atlas.size, (0, 0, 0, 0))
    texture_source = atlas.crop((88, 88, 226, 226)).convert("RGBA")
    fallback_texture = ImageOps.fit(texture_source, (frame_width, frame_height), method=Image.Resampling.LANCZOS)
    fallback_texture.putalpha(255)

    for index, connections in enumerate(PATH_CONNECTIONS):
        left = (index % ATLAS_COLUMNS) * frame_width
        top = (index // ATLAS_COLUMNS) * frame_height
        cell = atlas.crop((left, top, left + frame_width, top + frame_height))
        cell = remove_low_alpha(cell)
        cell = keep_largest_alpha_component(cell)
        cell = render_canonical_path_cell(cell, fallback_texture, connections, index == 0)
        normalized.alpha_composite(cell, (left, top))
        cell.close()
    fallback_texture.close()
    texture_source.close()
    atlas.close()
    return normalized


def normalize_sprite_atlas(image: Image.Image) -> Image.Image:
    atlas = pad_atlas(image)
    frame_width = atlas.width // ATLAS_COLUMNS
    frame_height = atlas.height // ATLAS_ROWS
    if (frame_width, frame_height) != (314, 314):
        raise ValueError(f"Sprite atlas frames must be 314x314, got {frame_width}x{frame_height}")
    atlas = remove_low_alpha(atlas)
    normalized = Image.new("RGBA", atlas.size, (0, 0, 0, 0))
    maximum = frame_width - (SPRITE_SAFE_INSET * 2)
    width, height = atlas.size
    alpha = bytearray(atlas.getchannel("A").tobytes())
    visited = bytearray(width * height)
    ownership = [bytearray(width * height) for _ in range(ATLAS_COLUMNS * ATLAS_ROWS)]

    for start, value in enumerate(alpha):
        if value == 0 or visited[start]:
            continue
        visited[start] = 1
        stack = [start]
        component: list[int] = []
        x_total = 0
        y_total = 0
        while stack:
            point = stack.pop()
            component.append(point)
            x = point % width
            y = point // width
            x_total += x
            y_total += y
            for neighbor in (
                point - 1 if x else -1,
                point + 1 if x + 1 < width else -1,
                point - width if y else -1,
                point + width if y + 1 < height else -1,
            ):
                if neighbor >= 0 and not visited[neighbor] and alpha[neighbor] > 0:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        if len(component) < 4:
            continue
        center_x = x_total / len(component)
        center_y = y_total / len(component)
        column = min(ATLAS_COLUMNS - 1, max(0, int(center_x // frame_width)))
        row = min(ATLAS_ROWS - 1, max(0, int(center_y // frame_height)))
        owner = ownership[(row * ATLAS_COLUMNS) + column]
        for point in component:
            owner[point] = alpha[point]

    for index in range(ATLAS_COLUMNS * ATLAS_ROWS):
        left = (index % ATLAS_COLUMNS) * frame_width
        top = (index // ATLAS_COLUMNS) * frame_height
        owner_mask = Image.frombytes("L", atlas.size, bytes(ownership[index]))
        bbox = owner_mask.getbbox()
        if bbox is None:
            raise ValueError(f"Sprite atlas cell {index} is empty")
        sprite = atlas.crop(bbox)
        sprite.putalpha(owner_mask.crop(bbox))
        scale = min(1.0, maximum / sprite.width, maximum / sprite.height)
        if scale < 1.0:
            sprite = sprite.resize(
                (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
                Image.Resampling.LANCZOS,
            )
        x = (frame_width - sprite.width) // 2
        y = (frame_height - sprite.height) // 2
        normalized.alpha_composite(sprite, (left + x, top + y))
        sprite.close()
        owner_mask.close()
    atlas.close()
    return normalized


def normalize_title_sprite(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        raise ValueError("Sprite mode requires a source image with an alpha channel")
    cleaned = keep_largest_alpha_component(remove_low_alpha(image))
    bbox = threshold_bbox(cleaned, 0)
    if bbox is None:
        raise ValueError("Sprite contains no visible alpha")
    sprite = cleaned.crop(bbox)
    maximum = min(image.size) - 174
    scale = min(maximum / sprite.width, maximum / sprite.height)
    sprite = sprite.resize(
        (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
        Image.Resampling.LANCZOS,
    )
    normalized = Image.new("RGBA", image.size, (0, 0, 0, 0))
    normalized.alpha_composite(
        sprite,
        ((image.width - sprite.width) // 2, (image.height - sprite.height) // 2),
    )
    normalized = keep_largest_alpha_component(normalized)
    sprite.close()
    cleaned.close()
    image.close()
    return normalized


def normalize_castle_strip(image: Image.Image) -> Image.Image:
    if "A" not in image.getbands():
        raise ValueError("Castle strip mode requires a source image with an alpha channel")
    if image.width % CASTLE_FRAME_COUNT != 0:
        raise ValueError("Castle strip width must divide into four equal frames")
    frame_width = image.width // CASTLE_FRAME_COUNT
    if (frame_width, image.height) != (543, 724):
        raise ValueError(f"Castle frames must be 543x724, got {frame_width}x{image.height}")
    normalized = Image.new("RGBA", image.size, (0, 0, 0, 0))
    for index in range(CASTLE_FRAME_COUNT):
        frame = image.crop((index * frame_width, 0, (index + 1) * frame_width, image.height))
        bbox = threshold_bbox(frame, 64)
        if bbox is None:
            raise ValueError(f"Castle frame {index} contains no meaningful alpha")
        center_x = (bbox[0] + bbox[2] - 1) / 2
        shift_x = round(CASTLE_ANCHOR_X - center_x)
        shift_y = CASTLE_GROUND_CONTACT_Y - (bbox[3] - 1)
        normalized.alpha_composite(frame, (index * frame_width + shift_x, shift_y))
        frame.close()
    image.close()
    return normalized


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
    elif mode == "path-atlas":
        image = normalize_path_atlas(image)
    elif mode == "sprite-atlas":
        image = normalize_sprite_atlas(image)
    elif mode == "sprite":
        image = normalize_title_sprite(image)
    elif mode == "castle-strip":
        image = normalize_castle_strip(image)
    save_options: dict[str, object] = {
        "format": "WEBP",
        "method": WEBP_METHOD,
        "exact": True,
    }
    if mode in {"atlas", "lossless", "path-atlas", "sprite-atlas", "sprite", "castle-strip"}:
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
    parser.add_argument(
        "--mode",
        choices=("atlas", "lossless", "opaque", "path-atlas", "sprite-atlas", "sprite", "castle-strip"),
        required=True,
    )
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
