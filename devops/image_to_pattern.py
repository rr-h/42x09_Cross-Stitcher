#!/usr/bin/env python3
"""
image_to_pattern.py

Convert images to OXS cross-stitch patterns (app-compatible).

Performance:
- --jobs N : parallelise across multiple input files
- --palette-sample-max N : cap pixels used for palette discovery (0 = use all)
- --quantise-method octree : faster palette quantisation (less accurate than median-cut)
"""

from __future__ import annotations

import argparse
import math
import os
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

try:
    DITHER_NONE = Image.Dither.NONE  # type: ignore[attr-defined]
except AttributeError:
    DITHER_NONE = 0

from dmc_colors import DMC_COLORS, get_symbol_pool

NO_STITCH: int = 0xFFFF


def _xml_escape_attr(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _parse_size_limit(value: str) -> tuple[str, float]:
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


def _resolve_limit_px(spec: tuple[str, float], original: int) -> int:
    kind, val = spec
    if kind == "pct":
        return max(1, int(round(original * val)))
    return max(1, int(round(val)))


def _calculate_dimensions(img_width: int, img_height: int, max_width: int, max_height: int) -> tuple[int, int]:
    aspect_ratio = img_width / img_height
    width = max_width
    height = int(round(width / aspect_ratio))
    if height > max_height:
        height = max_height
        width = int(round(height * aspect_ratio))
    return max(1, width), max(1, height)


def _quantise_method_id(method: str) -> int:
    m = method.strip().lower()
    if m in ("median-cut", "median", "mediancut"):
        return 0
    if m in ("octree", "fastoctree", "fast-octree"):
        return 2
    raise ValueError(f"Unknown quantise method: {method}")


@dataclass(frozen=True)
class QuantisedColour:
    rgb: tuple[int, int, int]
    count: int


def _maybe_sample_pixels(rgb_pixels: np.ndarray, max_samples: int) -> np.ndarray:
    if max_samples <= 0:
        return rgb_pixels
    n = int(rgb_pixels.shape[0])
    if n <= max_samples:
        return rgb_pixels
    stride = max(1, n // max_samples)
    return rgb_pixels[::stride]


def _quantise_opaque_pixels(
    opaque_rgb: np.ndarray,
    max_colors: int,
    method: str,
    palette_sample_max: int,
) -> list[QuantisedColour]:
    if opaque_rgb.size == 0:
        return []

    work_rgb = _maybe_sample_pixels(opaque_rgb, palette_sample_max)
    n = int(work_rgb.shape[0])

    if n <= 250_000:
        packed = (
            (work_rgb[:, 0].astype(np.uint32) << 16)
            | (work_rgb[:, 1].astype(np.uint32) << 8)
            | work_rgb[:, 2].astype(np.uint32)
        )
        uniq, counts = np.unique(packed, return_counts=True)
        if uniq.size <= max_colors:
            order = np.argsort(-counts)
            out: list[QuantisedColour] = []
            for i in order:
                val = int(uniq[i])
                rgb = ((val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF)
                out.append(QuantisedColour(rgb=rgb, count=int(counts[i])))
            return out

    tile_w = min(2048, max(1, int(math.sqrt(n))))
    tile_h = int(math.ceil(n / tile_w))

    pad_n = tile_w * tile_h - n
    if pad_n > 0:
        pad = np.repeat(work_rgb[:1, :], pad_n, axis=0)
        flat = np.concatenate([work_rgb, pad], axis=0)
    else:
        flat = work_rgb

    img_arr = flat.reshape((tile_h, tile_w, 3)).astype(np.uint8)
    tmp_img = Image.fromarray(img_arr)

    # PIL quantize supports max 256 colors
    quantize_colors = min(max_colors, 256)
    q = tmp_img.quantize(
        colors=quantize_colors,
        method=_quantise_method_id(method),
        dither=DITHER_NONE,
    )

    pal = q.getpalette() or []
    colours = q.getcolors() or []
    colours.sort(key=lambda x: -x[0])

    out: list[QuantisedColour] = []
    seen: set[tuple[int, int, int]] = set()
    for count, idx in colours:
        base = int(idx) * 3
        if base + 2 >= len(pal):
            continue
        rgb = (int(pal[base]), int(pal[base + 1]), int(pal[base + 2]))
        if rgb in seen:
            continue
        seen.add(rgb)
        out.append(QuantisedColour(rgb=rgb, count=int(count)))

    return out


def _dmc_rgb_matrix() -> np.ndarray:
    return np.array([d["rgb"] for d in DMC_COLORS], dtype=np.int16)


def _weighted_colour_distance_sq(rgb: tuple[int, int, int], dmc_rgb: np.ndarray) -> np.ndarray:
    r = float(rgb[0])
    g = float(rgb[1])
    b = float(rgb[2])

    dr = r - dmc_rgb[:, 0].astype(np.float32)
    dg = g - dmc_rgb[:, 1].astype(np.float32)
    db = b - dmc_rgb[:, 2].astype(np.float32)

    r_mean = (r + dmc_rgb[:, 0].astype(np.float32)) / 2.0
    r_weight = 2.0 + r_mean / 256.0
    g_weight = 4.0
    b_weight = 2.0 + (255.0 - r_mean) / 256.0

    return r_weight * dr * dr + g_weight * dg * dg + b_weight * db * db


def _map_quantised_to_dmc(qcols: list[QuantisedColour]) -> list[dict]:
    if not qcols:
        return []

    dmc_rgb = _dmc_rgb_matrix()
    used = np.zeros(len(DMC_COLORS), dtype=bool)

    ordered = sorted(qcols, key=lambda qc: -qc.count)

    result: list[dict] = []
    for qc in ordered:
        dist_sq = _weighted_colour_distance_sq(qc.rgb, dmc_rgb)
        dist_sq[used] = np.inf
        best_i = int(np.argmin(dist_sq))
        used[best_i] = True
        dmc = DMC_COLORS[best_i]
        result.append({"dmc": dmc, "original_rgb": qc.rgb, "count": qc.count})

    by_rgb = {tuple(x["original_rgb"]): x for x in result}
    return [by_rgb[tuple(qc.rgb)] for qc in qcols]


def _assign_unique_symbols(palette: list[dict]) -> None:
    pool = get_symbol_pool(max(800, len(palette) + 50))
    used: set[str] = set()
    pool_iter = iter(pool)

    def good(sym: str) -> bool:
        if not sym or len(sym) != 1:
            return False
        cp = ord(sym)
        if cp > 0xFFFF or (0xD800 <= cp <= 0xDFFF):
            return False
        if 0x2800 <= cp <= 0x28FF:
            return False
        if sym.strip() == "":
            return False
        cat = unicodedata.category(sym)
        if cat in ("Mn", "Me", "Cf", "Cc", "Cs"):
            return False
        return True

    for p in palette:
        sym = str(p.get("symbol", "")).strip()
        if (not good(sym)) or (sym in used):
            while True:
                cand = next(pool_iter)
                if cand not in used:
                    sym = cand
                    break
            p["symbol"] = sym
        used.add(sym)


def _build_palette_and_targets(
    img_rgba: Image.Image,
    max_colors: int,
    use_dmc: bool,
    quantise_method: str,
    alpha_threshold: int,
    palette_sample_max: int,
) -> tuple[list[dict], np.ndarray]:
    arr = np.array(img_rgba, dtype=np.uint8)
    h, w, _ = arr.shape

    alpha = arr[:, :, 3]
    opaque_mask = alpha >= alpha_threshold
    if not np.any(opaque_mask):
        raise RuntimeError("No opaque pixels after alpha thresholding")

    rgb = arr[:, :, :3]
    opaque_rgb = rgb[opaque_mask].reshape((-1, 3))

    qcols = _quantise_opaque_pixels(
        opaque_rgb,
        max_colors=max_colors,
        method=quantise_method,
        palette_sample_max=palette_sample_max,
    )

    if use_dmc:
        if max_colors > len(DMC_COLORS):
            max_colors = len(DMC_COLORS)
        mappings = _map_quantised_to_dmc(qcols)
        palette_rgb = [m["dmc"]["rgb"] for m in mappings]
        palette: list[dict] = [
            {
                "name": m["dmc"]["name"],
                "brand": "DMC",
                "code": m["dmc"]["code"],
                "hex": m["dmc"]["hex"],
                "symbol": m["dmc"]["symbol"],
            }
            for m in mappings
        ]
    else:
        if max_colors > 490:
            raise RuntimeError("Custom palette max-colors > 490 is not supported (unique symbols required).")
        palette_rgb = [qc.rgb for qc in qcols]
        palette = [
            {"name": f"Colour {i + 1}", "hex": f"#{rgb_val[0]:02X}{rgb_val[1]:02X}{rgb_val[2]:02X}", "symbol": ""}
            for i, rgb_val in enumerate(palette_rgb)
        ]

    _assign_unique_symbols(palette)

    pal_img = Image.new("P", (1, 1))
    flat_pal: list[int] = []
    for r, g, b in palette_rgb:
        flat_pal.extend([int(r), int(g), int(b)])
    if len(flat_pal) < 768:
        flat_pal.extend([0] * (768 - len(flat_pal)))
    pal_img.putpalette(flat_pal)

    img_rgb = Image.fromarray(rgb)
    idx_img = img_rgb.quantize(palette=pal_img, dither=DITHER_NONE)
    idx = np.array(idx_img, dtype=np.uint16).reshape((h, w))

    targets = idx.reshape((-1,)).copy()
    targets[~opaque_mask.reshape((-1,))] = NO_STITCH

    return palette, targets


def _prune_unused_palette(palette: list[dict], targets: np.ndarray) -> tuple[list[dict], np.ndarray]:
    used = np.unique(targets[targets != NO_STITCH])
    if used.size == 0:
        raise RuntimeError("No stitches found after quantisation")

    used_sorted = np.sort(used).astype(np.uint16)
    remap = np.full((len(palette),), NO_STITCH, dtype=np.uint16)
    remap[used_sorted] = np.arange(used_sorted.size, dtype=np.uint16)

    out_targets = targets.copy()
    mask = out_targets != NO_STITCH
    out_targets[mask] = remap[out_targets[mask]]

    out_palette = [palette[int(i)] for i in used_sorted.tolist()]
    _assign_unique_symbols(out_palette)

    return out_palette, out_targets


def convert_image_to_pattern(
    image_path: str,
    *,
    title: str | None,
    resize: bool,
    max_width: tuple[str, float],
    max_height: tuple[str, float],
    max_colors: int,
    use_dmc_colors: bool,
    quantise_method: str,
    alpha_threshold: int,
    palette_sample_max: int,
) -> dict:
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)

    img_width, img_height = img.size

    if resize:
        max_w_px = min(_resolve_limit_px(max_width, img_width), img_width)
        max_h_px = min(_resolve_limit_px(max_height, img_height), img_height)
        width, height = _calculate_dimensions(img_width, img_height, max_w_px, max_h_px)
    else:
        width, height = img_width, img_height

    if (width, height) != (img_width, img_height):
        try:
            resample = Image.Resampling.LANCZOS
        except AttributeError:
            resample = Image.LANCZOS
        img = img.resize((width, height), resample=resample)

    img_rgba = img.convert("RGBA")

    palette, targets = _build_palette_and_targets(
        img_rgba,
        max_colors=max_colors,
        use_dmc=use_dmc_colors,
        quantise_method=quantise_method,
        alpha_threshold=alpha_threshold,
        palette_sample_max=palette_sample_max,
    )
    palette, targets = _prune_unused_palette(palette, targets)

    title_final = title if title else Path(image_path).stem

    return {
        "width": width,
        "height": height,
        "palette": palette,
        "targets": targets,
        "meta": {
            "title": title_final,
            "author": "Image Converter",
            "instructions": f"Converted from {Path(image_path).name} ({img_width}x{img_height} to {width}x{height})",
        },
    }


def write_oxs_file(pattern_doc: dict, output_path: str) -> None:
    width = int(pattern_doc["width"])
    height = int(pattern_doc["height"])
    palette = pattern_doc["palette"]
    targets: np.ndarray = pattern_doc["targets"]

    if targets.dtype != np.uint16:
        targets = targets.astype(np.uint16, copy=False)

    with open(output_path, "w", encoding="utf-8", newline="\n") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>')
        f.write("<chart>")

        props = {
            "oxsversion": "1.0",
            "chartwidth": str(width),
            "chartheight": str(height),
            "charttitle": pattern_doc["meta"]["title"],
            "author": pattern_doc["meta"]["author"],
            "instructions": pattern_doc["meta"]["instructions"],
            "stitchesperinch": "14",
            "palettecount": str(len(palette)),
        }

        f.write("<properties")
        for k, v in props.items():
            f.write(f' {k}="{_xml_escape_attr(str(v))}"')
        f.write("/>")

        f.write("<palette>")
        f.write('<palette_item index="0" number="cloth" name="cloth" color="ffffff" symbol="."/>')

        for i, p in enumerate(palette):
            idx = i + 1
            brand = str(p.get("brand", ""))
            code = str(p.get("code", ""))
            number = f"DMC {code}" if (brand.upper() == "DMC" and code) else code

            name = str(p.get("name", ""))
            hex_val = str(p.get("hex", "")).lstrip("#")
            sym = str(p.get("symbol", ""))

            f.write(
                f'<palette_item index="{idx}"'
                f' number="{_xml_escape_attr(number)}"'
                f' name="{_xml_escape_attr(name)}"'
                f' color="{_xml_escape_attr(hex_val)}"'
                f' symbol="{_xml_escape_attr(sym)}"'
                "/>"
            )

        f.write("</palette>")

        f.write("<fullstitches>")
        grid = targets.reshape((height, width))

        for y in range(height):
            row = grid[y]
            cols = np.flatnonzero(row != NO_STITCH)
            if cols.size == 0:
                continue
            parts: list[str] = []
            for x in cols:
                palindex = int(row[int(x)]) + 1
                parts.append(f'<stitch x="{int(x)}" y="{y}" palindex="{palindex}"/>')
            f.write("".join(parts))

        f.write("</fullstitches>")
        f.write("</chart>")


def _process_one(image_path: str, args_dict: dict) -> int:
    try:
        doc = convert_image_to_pattern(
            image_path,
            title=args_dict["title"],
            resize=args_dict["resize"],
            max_width=args_dict["max_width"],
            max_height=args_dict["max_height"],
            max_colors=args_dict["max_colors"],
            use_dmc_colors=args_dict["use_dmc_colors"],
            quantise_method=args_dict["quantise_method"],
            alpha_threshold=args_dict["alpha_threshold"],
            palette_sample_max=args_dict["palette_sample_max"],
        )
    except Exception as e:
        print(f"Error processing {image_path}: {e}", file=sys.stderr)
        return 1

    base_name = Path(image_path).stem + ".oxs"
    output_dir = args_dict["output_dir"]
    if output_dir:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        out_path = str(Path(output_dir) / base_name)
    else:
        out_path = str(Path(image_path).with_suffix(".oxs"))

    try:
        write_oxs_file(doc, out_path)
    except Exception as e:
        print(f"Error writing {out_path}: {e}", file=sys.stderr)
        return 1

    print(f"Saved: {out_path}  (palette: {len(doc['palette'])} colours, size: {doc['width']}x{doc['height']})")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert images to OXS patterns (fast, app-compatible).")
    parser.add_argument("files", nargs="+", help="Image files to convert")
    parser.add_argument("--title", type=str, default=None)
    parser.add_argument("--max-width", type=_parse_size_limit, default=_parse_size_limit("900"))
    parser.add_argument("--max-height", type=_parse_size_limit, default=_parse_size_limit("900"))
    parser.add_argument("--max-colors", type=int, default=490)
    parser.add_argument("--no-dmc", action="store_false", dest="use_dmc_colors")
    parser.add_argument("--resize", action="store_true")
    parser.add_argument("--output-dir", "-o", type=str, default=None)
    parser.add_argument("--quantise-method", type=str, default="median-cut", choices=["median-cut", "octree"])
    parser.add_argument("--alpha-threshold", type=int, default=128)
    parser.add_argument("--jobs", type=int, default=1)
    parser.add_argument("--palette-sample-max", type=int, default=0)
    parser.set_defaults(use_dmc_colors=True, resize=False)

    args = parser.parse_args()

    files = [f for f in args.files if os.path.isfile(f)]
    if not files:
        return 1

    if args.use_dmc_colors and args.max_colors > len(DMC_COLORS):
        args.max_colors = len(DMC_COLORS)

    args_dict = {
        "title": args.title,
        "resize": args.resize,
        "max_width": args.max_width,
        "max_height": args.max_height,
        "max_colors": args.max_colors,
        "use_dmc_colors": args.use_dmc_colors,
        "quantise_method": args.quantise_method,
        "alpha_threshold": args.alpha_threshold,
        "output_dir": args.output_dir,
        "palette_sample_max": args.palette_sample_max,
    }

    if args.jobs == 1 or len(files) == 1:
        failures = 0
        for p in files:
            failures += _process_one(p, args_dict)
        return 1 if failures else 0

    import multiprocessing as mp
    with mp.Pool(processes=args.jobs) as pool:
        results = pool.starmap(_process_one, [(p, args_dict) for p in files])
    return 1 if any(results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
