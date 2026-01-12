#!/usr/bin/env python3
"""
dmc_colors.py

Loads the DMC palette from src/data/dmcColors.ts (SSoT) for dev tooling.

Fixes:
- Robust parsing of the DMC_COLORS array without relying on fragile one-shot regex.
- Symbol validation and repair:
  - Must be a single JS UTF-16 code unit (BMP, not surrogate pair)
  - No braille
  - No whitespace/invisible
  - Must be unique
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

    # No braille
    if 0x2800 <= cp <= 0x28FF:
        return False

    # No whitespace / invisible formatting / combining
    cat = unicodedata.category(ch)
    if cat in ("Mn", "Me", "Cf", "Cc", "Cs"):
        return False
    if ch.strip() == "":
        return False

    # Avoid soft hyphen
    if cp == 0x00AD:
        return False

    return True


def _generate_symbol_pool(target_count: int = 1200) -> list[str]:
    candidates: list[int] = []

    # Printable ASCII (no space, no backslash)
    for cp in range(0x21, 0x7F):
        if cp == 0x5C:
            continue
        candidates.append(cp)

    # Latin-1 supplement (exclude soft hyphen)
    for cp in range(0x00A1, 0x0100):
        if cp == 0x00AD:
            continue
        candidates.append(cp)

    # Latin Extended-A, Greek, Cyrillic
    candidates.extend(range(0x0100, 0x0180))
    candidates.extend(range(0x0370, 0x0400))
    candidates.extend(range(0x0400, 0x0500))

    # Box drawing, block elements, geometric
    candidates.extend(range(0x2500, 0x2580))
    candidates.extend(range(0x2580, 0x25A0))
    candidates.extend(range(0x25A0, 0x2600))

    out: list[str] = []
    seen: set[str] = set()

    for cp in candidates:
        ch = chr(cp)
        if ch in seen:
            continue
        if not _is_good_symbol(ch):
            continue
        # Only take letters, numbers, punctuation, symbols
        cat = unicodedata.category(ch)
        if not (cat.startswith("L") or cat.startswith("N") or cat.startswith("P") or cat.startswith("S")):
            continue
        out.append(ch)
        seen.add(ch)
        if len(out) >= target_count:
            break

    if len(out) < target_count:
        raise RuntimeError(f"Symbol pool too small: {len(out)} < {target_count}")
    return out


_SYMBOL_POOL = _generate_symbol_pool(1200)


def get_symbol_pool(n: int) -> list[str]:
    if n <= 0:
        raise ValueError("n must be > 0")
    if n > len(_SYMBOL_POOL):
        raise ValueError(f"Requested {n} symbols, pool has {len(_SYMBOL_POOL)}")
    return _SYMBOL_POOL[:n]


def _fixup_symbols_in_place(colors: list[DMCColor]) -> None:
    used: set[str] = set()
    pool_iter = iter(_SYMBOL_POOL)

    def next_unused() -> str:
        while True:
            ch = next(pool_iter)
            if ch not in used and _is_good_symbol(ch):
                return ch

    for c in colors:
        sym = str(c.get("symbol", "")).strip()
        if not _is_good_symbol(sym) or sym in used:
            sym = next_unused()
            c["symbol"] = sym
        used.add(sym)


# -----------------------------
# TS parsing (robust)
# -----------------------------

def _normalise_hex(hex_str: str) -> str:
    s = hex_str.strip()
    if not s.startswith("#"):
        s = "#" + s
    if len(s) != 7:
        raise ValueError(f"Invalid hex colour: {hex_str}")
    return s.upper()


def _strip_ts_comments(text: str) -> str:
    # Remove /* ... */ first
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    # Remove // ... endline
    text = re.sub(r"//[^\n\r]*", "", text)
    return text


def _find_array_slice(text: str, anchor_re: re.Pattern[str]) -> str:
    m = anchor_re.search(text)
    if not m:
        raise RuntimeError("Could not find DMC_COLORS array anchor in dmcColors.ts")

    # Find first '[' after anchor
    i = text.find("[", m.end())
    if i < 0:
        raise RuntimeError("Could not find '[' after DMC_COLORS anchor")

    # Scan to matching closing ']' respecting strings
    depth = 0
    in_str: Optional[str] = None
    esc = False

    start = i
    for j in range(i, len(text)):
        ch = text[j]

        if in_str:
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
                continue
            if ch == in_str:
                in_str = None
            continue

        if ch in ("'", '"', "`"):
            in_str = ch
            continue

        if ch == "[":
            depth += 1
            continue
        if ch == "]":
            depth -= 1
            if depth == 0:
                return text[start : j + 1]

    raise RuntimeError("Unbalanced brackets while extracting DMC_COLORS array")


def _split_top_level_objects(array_text: str) -> list[str]:
    # array_text includes outer [ ... ]
    s = array_text.strip()
    if not (s.startswith("[") and s.endswith("]")):
        raise ValueError("array_text is not a bracketed array")

    inner = s[1:-1]
    objs: list[str] = []

    depth = 0
    in_str: Optional[str] = None
    esc = False
    obj_start: Optional[int] = None

    for i, ch in enumerate(inner):
        if in_str:
            if esc:
                esc = False
                continue
            if ch == "\\":
                esc = True
                continue
            if ch == in_str:
                in_str = None
            continue

        if ch in ("'", '"', "`"):
            in_str = ch
            continue

        if ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
            continue

        if ch == "}":
            depth -= 1
            if depth == 0 and obj_start is not None:
                objs.append(inner[obj_start : i + 1])
                obj_start = None
            continue

    return objs


_re_code = re.compile(r"\bcode\s*:\s*['\"]([^'\"]+)['\"]")
_re_name = re.compile(r"\bname\s*:\s*['\"]([^'\"]+)['\"]")
_re_hex = re.compile(r"\bhex\s*:\s*['\"](#?[0-9A-Fa-f]{6})['\"]")
_re_rgb = re.compile(r"\brgb\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]")
_re_sym = re.compile(r"\bsymbol\s*:\s*['\"]([^'\"]+)['\"]")


def _parse_object(obj_text: str) -> Optional[DMCColor]:
    code_m = _re_code.search(obj_text)
    name_m = _re_name.search(obj_text)
    hex_m = _re_hex.search(obj_text)
    rgb_m = _re_rgb.search(obj_text)
    sym_m = _re_sym.search(obj_text)
    if not (code_m and name_m and hex_m and rgb_m and sym_m):
        return None

    code = code_m.group(1).strip()
    name = name_m.group(1).strip()
    hex_val = _normalise_hex(hex_m.group(1))
    r = int(rgb_m.group(1))
    g = int(rgb_m.group(2))
    b = int(rgb_m.group(3))
    sym = sym_m.group(1)

    return {"code": code, "name": name, "hex": hex_val, "rgb": (r, g, b), "symbol": sym}


def _parse_dmc_colors_ts(ts_path: Path) -> list[DMCColor]:
    raw = ts_path.read_text(encoding="utf-8")
    text = _strip_ts_comments(raw)

    # Anchor around export const DMC_COLORS
    anchor = re.compile(r"\bexport\s+const\s+DMC_COLORS\b|\bconst\s+DMC_COLORS\b")
    array_text = _find_array_slice(text, anchor)

    objs = _split_top_level_objects(array_text)
    if len(objs) < 100:
        raise RuntimeError(f"Parsed only {len(objs)} objects from DMC_COLORS array")

    colors: list[DMCColor] = []
    for o in objs:
        c = _parse_object(o)
        if c:
            colors.append(c)

    if len(colors) < 100:
        raise RuntimeError(f"Parsed only {len(colors)} valid colours from dmcColors.ts")

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
        "Could not locate src/data/dmcColors.ts. Set DMC_COLORS_TS to the full path."
    )


def _load_dmc_colors() -> list[DMCColor]:
    ts_path = _find_dmc_colors_ts_path()
    colors = _parse_dmc_colors_ts(ts_path)
    _fixup_symbols_in_place(colors)
    return colors


DMC_COLORS: list[DMCColor] = _load_dmc_colors()

_code_map: dict[str, DMCColor] = {c["code"].lower(): c for c in DMC_COLORS}
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
    return _code_map.get(code.lower())


def find_by_hex(hex_str: str) -> Optional[DMCColor]:
    return _hex_map.get(_normalise_hex(hex_str))


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
