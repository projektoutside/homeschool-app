from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GAME_DIR = ROOT / "public" / "Games" / "PreschoolFun"
GENERATED_DIR = GAME_DIR / "generated"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class BirdVideoConfig:
    source_video: str
    atlas_name: str
    meta_name: str
    target_frame_height: int
    columns: int = 12
    padding: int = 18
    saturation_threshold: int = 42
    value_threshold: int = 28
    feather_sigma: float = 1.1


CONFIGS = (
    BirdVideoConfig(
        source_video="Seamless_Looping_Animation_Generation.mp4",
        atlas_name="bigbird-flight-atlas.png",
        meta_name="bigbird-flight-meta.json",
        target_frame_height=196,
    ),
    BirdVideoConfig(
        source_video="Seamless_Looping_Animation_Request.mp4",
        atlas_name="smallbird-flight-atlas.png",
        meta_name="smallbird-flight-meta.json",
        target_frame_height=148,
    ),
)


def extract_component_mask(frame_bgr: np.ndarray, config: BirdVideoConfig) -> np.ndarray:
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    seed = np.zeros_like(saturation, dtype=np.uint8)
    seed[(saturation > config.saturation_threshold) & (value > config.value_threshold)] = 255
    seed = cv2.morphologyEx(seed, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)

    component_count, labels, stats, _ = cv2.connectedComponentsWithStats(seed, 8)
    if component_count <= 1:
        return np.zeros_like(seed)

    component_index = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    component_mask = np.zeros_like(seed)
    component_mask[labels == component_index] = 255

    contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return component_mask

    filled = np.zeros_like(component_mask)
    cv2.drawContours(filled, [max(contours, key=cv2.contourArea)], -1, 255, thickness=cv2.FILLED)
    filled = cv2.morphologyEx(filled, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    filled = cv2.dilate(filled, np.ones((3, 3), np.uint8), iterations=1)
    return filled


def build_alpha(mask: np.ndarray, sigma: float) -> np.ndarray:
    alpha = cv2.GaussianBlur(mask, (0, 0), sigmaX=sigma, sigmaY=sigma)
    return np.clip(alpha, 0, 255).astype(np.uint8)


def read_video_frames(video_path: Path) -> tuple[list[np.ndarray], float]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 24.0)
    frames: list[np.ndarray] = []

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)

    capture.release()
    if not frames:
        raise RuntimeError(f"No frames were decoded from: {video_path}")

    return frames, fps


def regenerate_assets(config: BirdVideoConfig) -> None:
    video_path = GAME_DIR / config.source_video
    frames_bgr, fps = read_video_frames(video_path)

    rgba_frames: list[np.ndarray] = []
    bounds: list[tuple[int, int, int, int]] = []

    for frame_bgr in frames_bgr:
        mask = extract_component_mask(frame_bgr, config)
        if not np.any(mask):
            continue

        alpha = build_alpha(mask, config.feather_sigma)
        ys, xs = np.where(alpha > 12)
        if xs.size == 0 or ys.size == 0:
            continue

        left, right = int(xs.min()), int(xs.max()) + 1
        top, bottom = int(ys.min()), int(ys.max()) + 1
        bounds.append((left, top, right, bottom))

        rgba = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGBA)
        rgba[:, :, 3] = alpha
        rgba_frames.append(rgba)

    if not rgba_frames or not bounds:
        raise RuntimeError(f"Could not isolate a bird silhouette from: {video_path}")

    left = max(0, min(item[0] for item in bounds) - config.padding)
    top = max(0, min(item[1] for item in bounds) - config.padding)
    right = min(rgba_frames[0].shape[1], max(item[2] for item in bounds) + config.padding)
    bottom = min(rgba_frames[0].shape[0], max(item[3] for item in bounds) + config.padding)

    crop_width = right - left
    crop_height = bottom - top
    frame_height = config.target_frame_height
    frame_width = int(round(crop_width * (frame_height / crop_height)))

    atlas_rows = int(np.ceil(len(rgba_frames) / config.columns))
    atlas_width = frame_width * config.columns
    atlas_height = frame_height * atlas_rows
    atlas = Image.new("RGBA", (atlas_width, atlas_height), (0, 0, 0, 0))

    for frame_index, frame_rgba in enumerate(rgba_frames):
        cropped = frame_rgba[top:bottom, left:right]
        resized = Image.fromarray(cropped).resize((frame_width, frame_height), Image.Resampling.LANCZOS)
        column = frame_index % config.columns
        row = frame_index // config.columns
        atlas.paste(resized, (column * frame_width, row * frame_height), resized)

    atlas_path = GENERATED_DIR / config.atlas_name
    meta_path = GENERATED_DIR / config.meta_name
    atlas.save(atlas_path)

    metadata = {
        "frameCount": len(rgba_frames),
        "fps": fps,
        "duration": len(rgba_frames) / fps,
        "columns": config.columns,
        "rows": atlas_rows,
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "sheetWidth": atlas_width,
        "sheetHeight": atlas_height,
        "sourceVideo": config.source_video,
        "crop": {
            "left": left,
            "top": top,
            "right": right,
            "bottom": bottom,
        },
    }
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def main() -> None:
    for config in CONFIGS:
        regenerate_assets(config)
        print(f"Regenerated {config.atlas_name}")


if __name__ == "__main__":
    main()
