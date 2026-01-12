#!/usr/bin/env python3
"""dmc_colors.py

DMC Embroidery Thread Colour Database helpers for development tooling.

This module loads the DMC palette from the repository TypeScript file so the
Python dev scripts stay aligned with the app.

Expected location (relative to repo root):
  src/data/dmcColors.ts

Overrides:
- Environment variable DMC_COLORS_TS can point to a specific dmcColors.ts path.

Notes on symbols
- The app expects a symbol to be a single JavaScript UTF-16 code unit. In
  practice, that means BMP-only characters (U+0000..U+FFFF), excluding surrogate
  code points.
- This module automatically repairs invalid or duplicate symbols by assigning a
  replacement from a deterministic, code-safe symbol pool that avoids braille and
  surrogate-pair emoji code points.

"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, TypedDict
import math
import os
import re
import unicodedata


class DMCColor(TypedDict):
    code: str
    name: str
    hex: str
    rgb: tuple[int, int, int]
    symbol: str


# -----------------------------
# Symbol pool and validation
# -----------------------------

def _is_js_single_utf16_unit(ch: str) -> bool:
    if len(ch) != 1:
        return False
    cp = ord(ch)
    if cp > 0xFFFF:
        return False
    if 0xD800 <= cp <= 0xDFFF:
        return False
    return True


def _is_good_symbol(ch: str) -> bool:
    if not _is_js_single_utf16_unit(ch):
        return False

    cp = ord(ch)

    # No braille patterns (explicit user requirement).
    if 0x2800 <= cp <= 0x28FF:
        return False

    # Avoid variation selectors and invisible formatting.
    cat = unicodedata.category(ch)
    if cat in ("Mn", "Me", "Cf", "Cc", "Cs"):
        return False

    # Avoid whitespace.
    if ch.strip() == "":
        return False

    # Avoid soft hyphen.
    if cp == 0x00AD:
        return False

    return True


def _generate_symbol_pool(target_count: int = 800) -> list[str]:
    """Generate a deterministic pool of code-safe symbols.

    We intentionally avoid braille and only use BMP code points.
    """
    candidates: list[int] = []

    # Printable ASCII, excluding space. Exclude backslash (annoying in tooling).
    for cp in range(0x21, 0x7F):
        if cp == 0x5C:
            continue
        candidates.append(cp)

    # Latin-1 supplement (exclude soft hyphen).
    for cp in range(0x00A1, 0x0100):
        if cp == 0x00AD:
            continue
        candidates.append(cp)

    # Latin Extended-A letters.
    candidates.extend(range(0x0100, 0x0180))

    # Greek and Coptic.
    candidates.extend(range(0x0370, 0x0400))

    # Cyrillic.
    candidates.extend(range(0x0400, 0x0500))

    # Box Drawing.
    candidates.extend(range(0x2500, 0x2580))

    # Block Elements.
    candidates.extend(range(0x2580, 0x25A0))

    # Geometric Shapes (stops before misc symbols where emoji creep in more often).
    candidates.extend(range(0x25A0, 0x2600))

    out: list[str] = []
    seen: set[str] = set()
    for cp in candidates:
        ch = chr(cp)
        if ch in seen:
            continue
        if not _is_good_symbol(ch):
            continue
        cat = unicodedata.category(ch)
        if cat.startswith("L") or cat.startswith("N") or cat.startswith("P") or cat.startswith("S"):
            out.append(ch)
            seen.add(ch)
            if len(out) >= target_count:
                break

    if len(out) < target_count:
        raise RuntimeError(f"Symbol pool generation produced only {len(out)} symbols; need {target_count}.")

    return out


_SYMBOL_POOL: list[str] = _generate_symbol_pool(800)


def get_symbol_pool(n: int) -> list[str]:
    if n <= 0:
        raise ValueError("n must be > 0")
    if n > len(_SYMBOL_POOL):
        raise ValueError(f"Requested {n} symbols, but pool has only {len(_SYMBOL_POOL)}")
    return _SYMBOL_POOL[:n]


def _fixup_symbols_in_place(colors: list[DMCColor]) -> None:
    """Ensure each DMC entry has a good, unique symbol.

    Keeps existing symbols when valid and unique. Repairs only what is broken.
    """
    used: set[str] = set()
    pool_iter = iter(_SYMBOL_POOL)

    def next_unused() -> str:
        while True:
            ch = next(pool_iter)
            if ch not in used and _is_good_symbol(ch):
                return ch

    for c in colors:
        sym = c.get("symbol", "")
        if not _is_good_symbol(sym) or sym in used:
            sym = next_unused()
            c["symbol"] = sym
        used.add(sym)


# -----------------------------
# Load from TypeScript source
# -----------------------------

_TS_OBJECT_RE = re.compile(
    r"\{[^{}]*?\bcode\s*:\s*['\"][^'\"]+['\"][^{}]*?\bsymbol\s*:\s*['\"][^'\"]+['\"][^{}]*?\}",
    flags=re.DOTALL,
)


def _normalise_hex(hex_str: str) -> str:
    s = hex_str.strip()
    if not s.startswith("#"):
        s = "#" + s
    if len(s) != 7:
        raise ValueError(f"Invalid hex colour: {hex_str}")
    return s.upper()


def _parse_dmc_colors_ts(ts_path: Path) -> list[DMCColor]:
    text = ts_path.read_text(encoding="utf-8")

    blocks = _TS_OBJECT_RE.findall(text)
    if len(blocks) < 100:
        raise RuntimeError(
            f"Failed to parse DMC colours from {ts_path}. Found only {len(blocks)} blocks."
        )

    colors: list[DMCColor] = []
    for b in blocks:
        code_m = re.search(r"\bcode\s*:\s*['\"]([^'\"]+)['\"]", b)
        name_m = re.search(r"\bname\s*:\s*['\"]([^'\"]+)['\"]", b)
        hex_m = re.search(r"\bhex\s*:\s*['\"](#?[0-9A-Fa-f]{6})['\"]", b)
        rgb_m = re.search(r"\brgb\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]", b)
        sym_m = re.search(r"\bsymbol\s*:\s*['\"]([^'\"]+)['\"]", b)

        if not (code_m and name_m and hex_m and rgb_m and sym_m):
            continue

        code = code_m.group(1).strip()
        name = name_m.group(1).strip()
        hex_val = _normalise_hex(hex_m.group(1))
        r = int(rgb_m.group(1))
        g = int(rgb_m.group(2))
        b_ = int(rgb_m.group(3))
        sym = sym_m.group(1)

        colors.append(
            {
                "code": code,
                "name": name,
                "hex": hex_val,
                "rgb": (r, g, b_),
                "symbol": sym,
            }
        )

    if len(colors) < 100:
        raise RuntimeError(
            f"Failed to parse enough DMC colours from {ts_path}. Parsed {len(colors)}."
        )

    return colors


def _find_dmc_colors_ts_path() -> Path:
    override = os.getenv("DMC_COLORS_TS")
    if override:
        p = Path(override).expanduser().resolve()
        if not p.is_file():
            raise FileNotFoundError(f"DMC_COLORS_TS points to missing file: {p}")
        return p

    here = Path(__file__).resolve()
    for parent in [here.parent] + list(here.parents):
        candidate = parent / "src" / "data" / "dmcColors.ts"
        if candidate.is_file():
            return candidate

    raise FileNotFoundError(
        "Could not locate src/data/dmcColors.ts. "
        "Set DMC_COLORS_TS to the full path of dmcColors.ts."
    )


def _load_dmc_colors() -> list[DMCColor]:
    ts_path = _find_dmc_colors_ts_path()
    colors = _parse_dmc_colors_ts(ts_path)
    _fixup_symbols_in_place(colors)
    return colors


DMC_COLORS: list[DMCColor] = _load_dmc_colors()

_code_map: dict[str, DMCColor] = {c["code"]: c for c in DMC_COLORS}
_hex_map: dict[str, DMCColor] = {c["hex"].upper(): c for c in DMC_COLORS}
_name_map: dict[str, DMCColor] = {c["name"].lower(): c for c in DMC_COLORS}
_symbol_map: dict[str, DMCColor] = {c["symbol"]: c for c in DMC_COLORS}


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    s = hex_str.strip().lstrip("#")
    if len(s) != 6:
        raise ValueError(f"Invalid hex colour: {hex_str}")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"


def color_distance(rgb1: tuple[int, int, int], rgb2: tuple[int, int, int]) -> float:
    r_mean = (rgb1[0] + rgb2[0]) / 2.0
    dr = rgb1[0] - rgb2[0]
    dg = rgb1[1] - rgb2[1]
    db = rgb1[2] - rgb2[2]
    r_weight = 2.0 + r_mean / 256.0
    g_weight = 4.0
    b_weight = 2.0 + (255.0 - r_mean) / 256.0
    return math.sqrt(r_weight * dr * dr + g_weight * dg * dg + b_weight * db * db)


def find_by_code(code: str) -> Optional[DMCColor]:
    return _code_map.get(code)


def find_by_hex(hex_str: str) -> Optional[DMCColor]:
    normalised = _normalise_hex(hex_str)
    return _hex_map.get(normalised)


def find_by_name(name: str) -> Optional[DMCColor]:
    return _name_map.get(name.lower())


def find_by_symbol(symbol: str) -> Optional[DMCColor]:
    if not symbol:
        return None
    return _symbol_map.get(symbol)


def find_closest_dmc(rgb: tuple[int, int, int]) -> DMCColor:
    closest = DMC_COLORS[0]
    min_dist = float("inf")
    for dmc in DMC_COLORS:
        dist = color_distance(rgb, dmc["rgb"])
        if dist < min_dist:
            min_dist = dist
            closest = dmc
    return closest


def get_color_count() -> int:
    return len(DMC_COLORS)


if __name__ == "__main__":
    print(f"Loaded DMC colours: {len(DMC_COLORS)}")
