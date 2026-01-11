#!/usr/bin/env python3
"""
Batch converter for images to OXS cross-stitch patterns.
Uses DMC thread colours with pre-assigned symbols.
"""

import argparse
import os
import sys
from collections import defaultdict
from xml.etree.ElementTree import Element, SubElement, tostring

from PIL import Image, ImageOps

from dmc_colors import (
    DMC_COLORS,
    DMCColor,
    color_distance,
    rgb_to_hex,
)

NO_STITCH = 6695535

# Fallback symbols for non-DMC mode (when --no-dmc is used)
FALLBACK_SYMBOLS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$%&*+-=~^<>!?/|"


def parse_size_limit(value: str) -> tuple[str, float]:
    """
    Parse a size limit that can be either:
      - pixels: "900"
      - percentage: "50%" or "100%"

    Returns:
      ("px", 900.0) or ("pct", 0.5)
    """
    s = value.strip()
    if not s:
        raise argparse.ArgumentTypeError("Empty size limit")

    if s.endswith("%"):
        try:
            pct = float(s[:-1])
        except ValueError as e:
            raise argparse.ArgumentTypeError(f"Invalid percentage: {value}") from e
        if pct <= 0:
            raise argparse.ArgumentTypeError(f"Percentage must be > 0: {value}")
        return ("pct", pct / 100.0)

    try:
        px = int(s)
    except ValueError as e:
        raise argparse.ArgumentTypeError(f"Invalid pixel value: {value}") from e
    if px <= 0:
        raise argparse.ArgumentTypeError(f"Pixel value must be > 0: {value}")
    return ("px", float(px))


def resolve_limit_px(spec: tuple[str, float], original: int) -> int:
    """
    Resolve a ("pct", 0.5) or ("px", 900.0) spec into a pixel limit
    using the original dimension. Always returns at least 1.
    """
    kind, val = spec
    if kind == "pct":
        return max(1, int(round(original * val)))
    return max(1, int(round(val)))


class ColorCount:
    """Tracks RGB colour with pixel count for quantisation."""
    __slots__ = ("rgb", "count")

    def __init__(self, rgb: tuple[int, int, int], count: int):
        self.rgb = rgb
        self.count = count


class ColorBox:
    """Bounding box for median cut colour quantisation."""
    __slots__ = ("colors", "r_min", "r_max", "g_min", "g_max", "b_min", "b_max")

    def __init__(self, color_counts: list[ColorCount]):
        self.colors = color_counts
        self.r_min, self.r_max = 255, 0
        self.g_min, self.g_max = 255, 0
        self.b_min, self.b_max = 255, 0
        self._calculate_bounds()

    def _calculate_bounds(self) -> None:
        for c in self.colors:
            self.r_min = min(self.r_min, c.rgb[0])
            self.r_max = max(self.r_max, c.rgb[0])
            self.g_min = min(self.g_min, c.rgb[1])
            self.g_max = max(self.g_max, c.rgb[1])
            self.b_min = min(self.b_min, c.rgb[2])
            self.b_max = max(self.b_max, c.rgb[2])

    @property
    def volume(self) -> int:
        return max(
            self.r_max - self.r_min,
            self.g_max - self.g_min,
            self.b_max - self.b_min,
        )


def calculate_dimensions(
    img_width: int,
    img_height: int,
    max_width: int,
    max_height: int,
) -> tuple[int, int]:
    """Calculate target dimensions maintaining aspect ratio (no stretching)."""
    aspect_ratio = img_width / img_height
    width = max_width
    height = round(width / aspect_ratio)

    if height > max_height:
        height = max_height
        width = round(height * aspect_ratio)

    return max(1, width), max(1, height)


def median_cut(color_counts: list[ColorCount], num_colors: int) -> list[tuple[int, int, int]]:
    """Median cut colour quantisation algorithm."""
    if not color_counts:
        return []
    if len(color_counts) <= num_colors:
        return [c.rgb for c in color_counts]

    boxes = [ColorBox(color_counts)]

    while len(boxes) < num_colors:
        # Find box with largest volume that can be split
        max_volume = 0
        max_box_index = -1
        for i, box in enumerate(boxes):
            if box.volume > max_volume and len(box.colors) > 1:
                max_volume = box.volume
                max_box_index = i

        if max_box_index == -1:
            break

        box_to_split = boxes.pop(max_box_index)

        # Determine which channel has the largest range
        r_range = box_to_split.r_max - box_to_split.r_min
        g_range = box_to_split.g_max - box_to_split.g_min
        b_range = box_to_split.b_max - box_to_split.b_min

        if r_range >= g_range and r_range >= b_range:
            channel = 0
        elif g_range >= b_range:
            channel = 1
        else:
            channel = 2

        # Sort by selected channel
        box_to_split.colors.sort(key=lambda c: c.rgb[channel])

        # Find median by pixel count
        total_count = sum(c.count for c in box_to_split.colors)
        cum_count = 0
        median_index = len(box_to_split.colors) // 2

        for i, c in enumerate(box_to_split.colors):
            cum_count += c.count
            if cum_count >= total_count / 2:
                median_index = max(1, i)
                break

        # Split into two boxes
        colors1 = box_to_split.colors[:median_index]
        colors2 = box_to_split.colors[median_index:]

        if colors1:
            boxes.append(ColorBox(colors1))
        if colors2:
            boxes.append(ColorBox(colors2))

    # Calculate weighted average colour for each box
    palette: list[tuple[int, int, int]] = []
    for box in boxes:
        total_r, total_g, total_b, total_count = 0, 0, 0, 0
        for c in box.colors:
            total_r += c.rgb[0] * c.count
            total_g += c.rgb[1] * c.count
            total_b += c.rgb[2] * c.count
            total_count += c.count

        palette.append((
            round(total_r / total_count),
            round(total_g / total_count),
            round(total_b / total_count),
        ))

    return palette


def find_closest_palette_index(
    rgb: tuple[int, int, int],
    palette: list[tuple[int, int, int]],
) -> int:
    """Find index of closest colour in palette."""
    min_dist = float("inf")
    closest_index = 0

    for i, p_rgb in enumerate(palette):
        dist = color_distance(rgb, p_rgb)
        if dist < min_dist:
            min_dist = dist
            closest_index = i

    return closest_index


def map_to_dmc(quantized_colors: list[tuple[int, int, int]]) -> list[dict]:
    """
    Map quantised colours to closest DMC colours.
    Penalises already-used colours to encourage variety.

    Returns list of {"dmc": DMCColor, "original_rgb": tuple}.
    """
    used_codes: set[str] = set()
    result: list[dict] = []

    for rgb in quantized_colors:
        best_dmc: DMCColor | None = None
        best_dist = float("inf")

        for dmc in DMC_COLORS:
            dist = color_distance(rgb, dmc["rgb"])
            # Penalise already-used colours
            if dmc["code"] in used_codes:
                dist *= 1.5

            if dist < best_dist:
                best_dist = dist
                best_dmc = dmc

        if best_dmc is not None:
            used_codes.add(best_dmc["code"])
            result.append({"dmc": best_dmc, "original_rgb": rgb})

    return result


def convert_image_to_pattern(image_path: str, options: dict) -> dict | None:
    """Convert image file to pattern document."""
    try:
        img = Image.open(image_path)
        img = ImageOps.exif_transpose(img)
    except Exception as e:
        print(f"Error opening image {image_path}: {e}", file=sys.stderr)
        return None

    img_width, img_height = img.size

    # Determine output dimensions
    if options.get("resize"):
        max_w_px = resolve_limit_px(options["max_width"], img_width)
        max_h_px = resolve_limit_px(options["max_height"], img_height)

        # Do not upscale: these are maxima.
        max_w_px = min(max_w_px, img_width)
        max_h_px = min(max_h_px, img_height)

        width, height = calculate_dimensions(img_width, img_height, max_w_px, max_h_px)
    else:
        width, height = img_width, img_height

    # Resize only if dimensions actually change
    if (width, height) != (img_width, img_height):
        try:
            resample = Image.Resampling.LANCZOS
        except AttributeError:
            resample = Image.LANCZOS
        img = img.resize((width, height), resample=resample)

    # Convert to RGBA
    img_rgba = img.convert("RGBA")
    pixel_data = list(img_rgba.getdata())

    # Extract unique colours with counts
    color_map: dict[tuple[int, int, int], int] = defaultdict(int)
    opaque_count = 0

    for r, g, b, a in pixel_data:
        if a < 128:
            continue
        opaque_count += 1
        color_map[(r, g, b)] += 1

    print(
        f"  Dimensions: {width}x{height}, opaque pixels: {opaque_count}, unique colours: {len(color_map)}"
    )

    if not color_map:
        print(f"No opaque pixels found in {image_path}", file=sys.stderr)
        return None

    # Quantise colours
    color_counts = [ColorCount(rgb, count) for rgb, count in color_map.items()]
    quantized_colors = median_cut(color_counts, options["max_colors"])

    # Build palette
    if options["use_dmc_colors"]:
        dmc_mappings = map_to_dmc(quantized_colors)
        palette = [
            {
                "name": m["dmc"]["name"],
                "brand": "DMC",
                "code": m["dmc"]["code"],
                "hex": m["dmc"]["hex"],
                "symbol": m["dmc"]["symbol"],  # Use built-in DMC symbol
            }
            for m in dmc_mappings
        ]
        palette_rgb = [m["dmc"]["rgb"] for m in dmc_mappings]
    else:
        palette = [
            {
                "name": f"Colour {i + 1}",
                "hex": rgb_to_hex(*rgb),
                "symbol": FALLBACK_SYMBOLS[i % len(FALLBACK_SYMBOLS)],
            }
            for i, rgb in enumerate(quantized_colors)
        ]
        palette_rgb = quantized_colors

    print(f"  Palette size: {len(palette)}")

    # Map pixels to palette indices
    targets = [0] * (width * height)

    for y in range(height):
        row_base = y * width
        for x in range(width):
            idx = row_base + x
            r, g, b, a = pixel_data[idx]

            if a < 128:
                targets[idx] = NO_STITCH
            else:
                targets[idx] = find_closest_palette_index((r, g, b), palette_rgb)

    # Prune unused palette entries
    used_indices = sorted(set(t for t in targets if t != NO_STITCH))

    if not used_indices:
        print(f"No stitches found for {image_path}", file=sys.stderr)
        return None

    index_remap = {old: new for new, old in enumerate(used_indices)}
    new_palette = [palette[i] for i in used_indices]

    for i in range(len(targets)):
        if targets[i] != NO_STITCH:
            targets[i] = index_remap[targets[i]]

    title_opt = options.get("title")
    title = title_opt if title_opt else os.path.basename(image_path).rsplit(".", 1)[0]

    return {
        "width": width,
        "height": height,
        "palette": new_palette,
        "targets": targets,
        "meta": {
            "title": title,
            "author": "Image Converter",
            "instructions": (
                f"Converted from {os.path.basename(image_path)} ({img_width}x{img_height} to {width}x{height})"
            ),
        },
    }


def create_oxs_file(pattern_doc: dict) -> str:
    """Generate OXS XML content from pattern document."""
    chart = Element("chart")

    SubElement(
        chart,
        "properties",
        {
            "oxsversion": "1.0",
            "chartwidth": str(pattern_doc["width"]),
            "chartheight": str(pattern_doc["height"]),
            "charttitle": pattern_doc["meta"]["title"],
            "author": pattern_doc["meta"]["author"],
            "instructions": pattern_doc["meta"]["instructions"],
            "stitchesperinch": "14",
            "palettecount": str(len(pattern_doc["palette"])),
        },
    )

    # Palette section
    palette_el = SubElement(chart, "palette")

    # Cloth/background entry
    SubElement(
        palette_el,
        "palette_item",
        {
            "index": "0",
            "number": "cloth",
            "name": "cloth",
            "color": "ffffff",
        },
    )

    # Thread entries (use built-in symbols from palette)
    for i, p in enumerate(pattern_doc["palette"]):
        SubElement(
            palette_el,
            "palette_item",
            {
                "index": str(i + 1),
                "number": p.get("code", ""),
                "name": p["name"],
                "color": p["hex"].lstrip("#"),
                "symbol": p["symbol"],
            },
        )

    # Stitches section
    stitches_el = SubElement(chart, "fullstitches")

    width = pattern_doc["width"]
    height = pattern_doc["height"]
    targets = pattern_doc["targets"]

    for y in range(height):
        row_base = y * width
        for x in range(width):
            target_index = targets[row_base + x]
            if target_index != NO_STITCH:
                SubElement(
                    stitches_el,
                    "stitch",
                    {
                        "x": str(x),
                        "y": str(y),
                        "palindex": str(target_index + 1),
                    },
                )

    return '<?xml version="1.0" encoding="UTF-8"?>' + tostring(chart, encoding="unicode")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert images to OXS cross-stitch patterns with DMC thread mapping."
    )
    parser.add_argument("files", nargs="+", help="Image files to convert")
    parser.add_argument(
        "--title",
        type=str,
        default=None,
        help="Optional title for the pattern (default: derived from filename)",
    )
    parser.add_argument(
        "--max-width",
        type=parse_size_limit,
        default=parse_size_limit("900"),
        help="Maximum pattern width in px or % (e.g. 900 or 100%, default: 900, only with --resize)",
    )
    parser.add_argument(
        "--max-height",
        type=parse_size_limit,
        default=parse_size_limit("900"),
        help="Maximum pattern height in px or % (e.g. 900 or 100%, default: 900, only with --resize)",
    )
    parser.add_argument(
        "--max-colors",
        type=int,
        default=490,
        help="Maximum number of colours (default: 490)",
    )
    parser.add_argument(
        "--no-dmc",
        action="store_false",
        dest="use_dmc_colors",
        help="Do not map to DMC colours",
    )
    parser.add_argument(
        "--resize",
        action="store_true",
        help="Resize image to fit max-width/max-height",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=str,
        default=None,
        help="Output directory (default: same as input file)",
    )
    parser.set_defaults(use_dmc_colors=True, resize=False)

    args = parser.parse_args()

    if args.max_colors <= 0:
        print("--max-colors must be > 0", file=sys.stderr)
        return 2

    options = {
        "title": args.title,
        "max_width": args.max_width,
        "max_height": args.max_height,
        "max_colors": args.max_colors,
        "use_dmc_colors": args.use_dmc_colors,
        "resize": args.resize,
    }

    for image_path in args.files:
        if not os.path.isfile(image_path):
            print(f"File not found: {image_path}", file=sys.stderr)
            continue

        print(f"Processing {image_path}...")
        pattern_doc = convert_image_to_pattern(image_path, options)

        if not pattern_doc:
            continue

        oxs_content = create_oxs_file(pattern_doc)

        base_name = os.path.splitext(os.path.basename(image_path))[0] + ".oxs"
        if args.output_dir:
            os.makedirs(args.output_dir, exist_ok=True)
            output_path = os.path.join(args.output_dir, base_name)
        else:
            output_path = os.path.splitext(image_path)[0] + ".oxs"

        try:
            with open(output_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(oxs_content)
        except OSError as e:
            print(f"Error writing {output_path}: {e}", file=sys.stderr)
            continue

        print(f"  Saved: {output_path}")
        print(f"  Palette: {len(pattern_doc['palette'])} colours")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
