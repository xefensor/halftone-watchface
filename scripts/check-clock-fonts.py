#!/usr/bin/env python3
"""Check clock/date fitting and generated text ink bounds in an exact release PBW.

Run after building and permission-packaging the watchface. Resource IDs come
from the matching local SDK build; native payload equality prevents accidentally
checking an old PBW with a newer resource header. Uses only Python's stdlib.
"""

import argparse
import calendar
import json
from pathlib import Path
import re
import struct
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
CLOCK_SIZES = (64, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108)
CLOCK_CHARS = "0123456789:"
DATE_SIZES = (28, 24, 22, 20, 18)
CONTEXT_SIZES = (28, 24, 20, 18)
RESOURCE_TABLE_BYTES = 256 * 16


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_font(packed, resource_id, chars=CLOCK_CHARS, ink_bottoms=False):
    """Read glyph metrics from a compiled Pebble v3 font resource."""
    record = 12 + 16 * (resource_id - 1)
    require(resource_id > 0 and record + 16 <= len(packed), "Invalid font resource ID")
    file_id, offset, length, _crc = struct.unpack_from("<IIII", packed, record)
    require(file_id == resource_id, "Resource header/pack ID mismatch")
    start = 12 + RESOURCE_TABLE_BYTES + offset
    require(start + length <= len(packed), "Font resource extends beyond the resource pack")
    data = packed[start:start + length]
    require(len(data) >= 10, "Truncated compiled font")
    version, _height, count, wildcard, buckets, cp_bytes, header_size, features = struct.unpack_from(
        "<BBHHBBBB", data)
    require(version == 3, "Unsupported compiled font version; update the verifier")
    require(cp_bytes in (2, 4) and header_size >= 10, "Invalid compiled font header")
    require(features & ~1 == 0, "Unsupported compiled font encoding; raw bitmap glyphs required")
    offset_bytes = 2 if features & 1 else 4
    table = header_size + buckets * 4
    entries = {}
    total = 0
    for bucket in range(buckets):
        _hash, number, position = struct.unpack_from("<BBH", data, header_size + bucket * 4)
        total += number
        bucket_entries = []
        for index in range(number):
            at = table + position + index * (cp_bytes + offset_bytes)
            require(at + cp_bytes + offset_bytes <= len(data), "Truncated font lookup table")
            codepoint = int.from_bytes(data[at:at + cp_bytes], "little")
            glyph_offset = int.from_bytes(data[at + cp_bytes:at + cp_bytes + offset_bytes], "little")
            # The SDK writes a reserved fallback and a concrete wildcard
            # glyph under the same codepoint. Clock digits must stay unique.
            require(codepoint not in entries or codepoint == wildcard,
                    "Duplicate compiled font codepoint")
            bucket_entries.append((codepoint, glyph_offset))
            entries.setdefault(codepoint, glyph_offset)
        # Match the firmware's binary search exactly, including the SDK's
        # duplicate wildcard entries. In this repertoire it chooses the
        # reserved missing glyph rather than the later concrete square.
        require(bucket_entries == sorted(bucket_entries, key=lambda entry: entry[0]),
                "Compiled font bucket is not sorted by codepoint")
        for codepoint in {entry[0] for entry in bucket_entries}:
            left, right = 0, len(bucket_entries) - 1
            while left <= right:
                middle = (left + right) // 2
                candidate, glyph_offset = bucket_entries[middle]
                if candidate < codepoint:
                    left = middle + 1
                elif candidate > codepoint:
                    right = middle - 1
                else:
                    entries[codepoint] = glyph_offset
                    break
    require(total == count, "Compiled font glyph count differs from its lookup table")
    glyph_base = table + total * (cp_bytes + offset_bytes)
    metrics = {}
    all_glyphs = chars is None
    require(not all_glyphs or wildcard == 0x25af, "Context font wildcard codepoint changed")
    for char in (map(chr, sorted(entries)) if all_glyphs else chars):
        codepoint = ord(char)
        require(codepoint in entries and (all_glyphs or codepoint != wildcard),
                "Required glyph missing: " + char)
        at = glyph_base + entries[codepoint]
        require(at + 5 <= len(data), "Truncated glyph: " + char)
        width, height, left, top, advance = struct.unpack_from("<BBbbb", data, at)
        require(advance > 0 and (char == " " or (width > 0 and height > 0)),
                "Empty required glyph: " + char)
        if ink_bottoms:
            byte_count = (width * height + 7) // 8
            require(at + 5 + byte_count <= len(data), "Truncated glyph bitmap: " + char)
            bitmap = data[at + 5:at + 5 + byte_count]
            last = next((bit for bit in range(width * height - 1, -1, -1)
                         if bitmap[bit // 8] & (1 << (bit % 8))), None)
            metrics[char] = top + last // width + 1 if last is not None else 0
        else:
            metrics[char] = (width, height, left, top, advance)
    return metrics


def context_metrics_header(packed, ids):
    fonts = {}
    for size in CONTEXT_SIZES:
        name = "FIRA_SANS_CONDENSED_BOLD_COMPLICATION_" + str(size)
        require(name in ids, "Generated resource header is missing " + name)
        fonts[size] = read_font(packed, ids[name], chars=None, ink_bottoms=True)
    codepoints = sorted(ord(char) for char in fonts[CONTEXT_SIZES[0]])
    require(len(codepoints) == 205 and codepoints[-1] <= 0xffff,
            "Context font repertoire changed; review the generated lookup")
    require(all(set(font) == set(fonts[CONTEXT_SIZES[0]]) for font in fonts.values()),
            "Context fonts have different repertoires")
    require(all(0 <= bottom <= 255 for font in fonts.values() for bottom in font.values()),
            "Context glyph ink bottom cannot be represented as uint8_t")
    wildcard = 0x25af
    require(wildcard in codepoints, "Context font wildcard is missing")

    def rows(values, width, format_value=str):
        return "\n".join("  " + ", ".join(map(format_value, values[index:index + width])) + ","
                         for index in range(0, len(values), width))

    generated = """#pragma once

// Generated from the compiled context PFO bitmaps; do not edit the tables.
// Regenerate after building with:
// python3 scripts/check-clock-fonts.py --pbw dist/<release>.pbw --write-context-metrics
// Bottoms are foreground ink bounds, exclusive, relative to the text origin.
// Bundled glyphs are exact. Firmware emoji fonts align to the nominal baseline;
// other missing glyphs use the bundled wildcard. Firmware-provided glyph ink
// can vary, so the emoji policy is baseline alignment rather than exact bounds.
#include <stdint.h>

static const uint16_t s_context_text_codepoints[] = {
%s
};

// Font order: 28, 24, 20, 18. Space is blank; wildcard uses the first PFO entry.
static const uint8_t s_context_text_bottoms[4][205] = {
%s
};

// Invalid UTF-8 consumes one byte and uses the bundled missing-glyph metric.
// Reading continuations sequentially avoids crossing a truncated NUL string.
static inline uint32_t context_text_next_codepoint(const unsigned char **cursor) {
  const unsigned char *start = *cursor;
  const unsigned char lead = *start;
  *cursor = start + 1;
  if (lead < 0x80) return lead;
  int count;
  uint32_t value, minimum;
  if (lead >= 0xc2 && lead <= 0xdf) {
    count = 2; value = lead & 0x1f; minimum = 0x80;
  } else if (lead >= 0xe0 && lead <= 0xef) {
    count = 3; value = lead & 0x0f; minimum = 0x800;
  } else if (lead >= 0xf0 && lead <= 0xf4) {
    count = 4; value = lead & 0x07; minimum = 0x10000;
  } else {
    return 0x25af;
  }
  for (int index = 1; index < count; ++index) {
    const unsigned char next = start[index];
    if ((next & 0xc0) != 0x80) return 0x25af;
    value = (value << 6) | (next & 0x3f);
  }
  if (value < minimum || value > 0x10ffff ||
      (value >= 0xd800 && value <= 0xdfff)) return 0x25af;
  *cursor = start + count;
  return value;
}

// Match PebbleOS v4.33.1 codepoint_is_emoji(), including BMP emoji.
static inline int context_text_is_emoji(uint32_t value) {
  return (value >= 0x1f300 && value <= 0x1faff) ||
      (value >= 0x2300 && value <= 0x23ff) ||
      (value >= 0x2600 && value <= 0x27bf) ||
      (value >= 0x2b00 && value <= 0x2bff) ||
      (value >= 0x1f100 && value <= 0x1f2ff) ||
      value == 0x2192 || value == 0x25aa || value == 0x25ab ||
      value == 0x25b6 || value == 0x25ba || value == 0x25c0 ||
      (value >= 0x25fb && value <= 0x25fe);
}

// These Unicode spaces, formatting marks and modifiers have no drawn ink.
// In particular, emoji variation selectors/ZWJ must not introduce a wildcard.
static inline int context_text_has_no_ink(uint32_t value) {
  return value <= 0x20 || (value >= 0x7f && value <= 0x9f) || value == 0xa0 ||
      (value >= 0x2000 && value <= 0x200f) ||
      (value >= 0x202a && value <= 0x202f) ||
      (value >= 0x2060 && value <= 0x206f) || value == 0x205f ||
      value == 0x20e3 || value == 0x3000 || value == 0xfe0e || value == 0xfe0f ||
      value == 0xfeff || (value >= 0xfff9 && value <= 0xfffc) ||
      (value >= 0x1f3fb && value <= 0x1f3ff) ||
      (value >= 0xe0000 && value <= 0xe007f) ||
      (value >= 0xf0000 && value <= 0x10fffd);
}

// Use the final fitted/ellipsized single-line text and its selected font size.
// Add the text origin afterwards, then clamp to the actual drawing layer.
static inline int context_text_ink_bottom(const char *text, int font_size) {
  const int baseline = font_size == 28 || font_size == 24 || font_size == 20 ? font_size : 18;
  const int font = font_size == 28 ? 0 : font_size == 24 ? 1 : font_size == 20 ? 2 : 3;
  const int count = sizeof(s_context_text_codepoints) / sizeof(s_context_text_codepoints[0]);
  const int wildcard = %d;
  int bottom = 0;
  if (!text) return bottom;
  const unsigned char *cursor = (const unsigned char *)text;
  while (*cursor) {
    const uint32_t codepoint = context_text_next_codepoint(&cursor);
    if (context_text_has_no_ink(codepoint)) continue;
    int left = 0, right = count;
    while (left < right) {
      const int middle = left + (right - left) / 2;
      if (s_context_text_codepoints[middle] < codepoint) left = middle + 1;
      else right = middle;
    }
    const int glyph_bottom = left < count && s_context_text_codepoints[left] == codepoint
        ? s_context_text_bottoms[font][left] : context_text_is_emoji(codepoint)
        ? baseline : s_context_text_bottoms[font][wildcard];
    if (glyph_bottom > bottom) bottom = glyph_bottom;
  }
  return bottom;
}
""" % (rows(codepoints, 10, lambda value: "0x%04x" % value),
       ",\n".join("  { // %dpx\n%s\n  }" % (size, rows([fonts[size][chr(cp)] for cp in codepoints], 20))
                    for size in CONTEXT_SIZES), codepoints.index(wildcard))
    return generated


def measure(text, metrics):
    advance = 0
    left = top = sys.maxsize
    right = bottom = -sys.maxsize
    for char in text:
        width, height, x, y, step = metrics[char]
        if width and height:
            left = min(left, advance + x)
            right = max(right, advance + x + width)
            top = min(top, y)
            bottom = max(bottom, y + height)
        advance += step
    return advance, left, right, top, bottom


def source_ink_bounds(source):
    function = re.search(r"static inline int watch_layout_clock_y\([^)]*\)\s*\{(.*?)\n\}", source, re.S)
    require(function is not None, "watch_layout_clock_y helper missing from layout header")
    table = re.search(r"fonts\[\]\s*=\s*\{(.*?)\};", function.group(1), re.S)
    require(table is not None, "Clock ink-bound table missing from layout helper")
    rows = [tuple(map(int, values)) for values in re.findall(r"\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\}", table.group(1))]
    require(len(rows) == len(CLOCK_SIZES), "Clock ink-bound table has unexpected or duplicate rows")
    result = {size: (top, bottom) for size, top, bottom in rows}
    require(set(result) == set(CLOCK_SIZES), "Clock ink-bound table does not cover all 11 prepared fonts")
    center = re.search(r"watch_layout_interpolate\(\s*contextual\s*\?\s*(\d+)\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*height\s*\)", function.group(1))
    require(center is not None and tuple(map(int, center.groups())) == (88, 96, 88),
            "Clock center policy changed; review the verifier's vertical budgets")
    return result


def source_date_guard(source):
    function = re.search(r"static inline int watch_layout_date_y\([^)]*\)\s*\{(.*?)\n\}", source, re.S)
    require(function is not None, "watch_layout_date_y guard missing from layout header")
    body = function.group(1)
    sizes = re.search(r"sizes\[\]\s*=\s*\{([^}]+)\}", body)
    require(sizes is not None and tuple(map(int, re.findall(r"\d+", sizes.group(1)))) == DATE_SIZES,
            "Date guard font order changed; review the verifier")
    table = re.search(r"tails\[\]\s*=\s*\{(.*?)\};", body, re.S)
    require(table is not None, "Date tail-guard table is missing")
    rows = re.findall(r'\{\s*"([^"]+)"\s*,\s*\{([^}]+)\}\s*\}', table.group(1))
    tails = {}
    for char, values in rows:
        values = tuple(map(int, re.findall(r"\d+", values)))
        require(len(char) == 1 and char not in tails and len(values) == len(DATE_SIZES),
                "Invalid or duplicate date tail-guard row")
        tails[char] = values
    require(tails, "Date tail-guard table is empty")
    limit = re.search(r"watch_layout_interpolate\(\s*contextual\s*\?\s*(\d+)\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*height\s*\)", body)
    require(limit is not None and tuple(map(int, limit.groups())) == (49, 50, 49),
            "Date bottom policy changed; review the verifier's gap budget")
    require(re.search(r"return\s+base_y\s*-\s*\(\s*overflow\s*>\s*0\s*\?\s*overflow\s*:\s*0\s*\)", body) is not None,
            "Date guard shifting policy changed; review the verifier")
    return tails


def verify_dates(packed, ids, native, layout, minimum_clock_tops):
    arrays = re.findall(r"static const char \*const s_(\w+)_days\[\]\s*=\s*\{(.*?)\};", native, re.S)
    require(len(arrays) == 17, "Expected all 17 localized weekday arrays")
    require('"%s · %d.%d."' in native, "Date text format changed; review the date corpus")
    weekdays = [(language, day) for language, body in arrays for day in re.findall(r'"([^"]+)"', body)]
    require(len(weekdays) == 17 * 7, "Localized weekday arrays must each contain seven names")
    tails = source_date_guard(layout)
    chars = sorted(set("0123456789 ·." + "".join(day for _language, day in weekdays) + "".join(tails)))
    fonts = {}
    for size in DATE_SIZES:
        name = ("FIRA_SANS_CONDENSED_BOLD_COMPLICATION_18" if size == 18
                else "FIRA_SANS_CONDENSED_BOLD_" + str(size))
        require(name in ids, "Generated resource header is missing date font " + name)
        fonts[size] = read_font(packed, ids[name], chars)
    for char, values in tails.items():
        actual = tuple(fonts[size][char][3] + fonts[size][char][1] for size in DATE_SIZES)
        require(values == actual,
                f"Date ink metadata drift for {char!r}: C table {values}, compiled fonts {actual}")
    for size, metrics in fonts.items():
        for char, glyph in metrics.items():
            require(not glyph[1] or glyph[3] + glyph[1] <= size or char in tails,
                    f"Uncovered date tail in {size}px font: {char!r}, bottom {glyph[3] + glyph[1]}")
    strings = 0
    checks = 0
    minimum_gap = sys.maxsize
    minimum_top = sys.maxsize
    for language, day in weekdays:
        for month in range(1, 13):
            for date in range(1, calendar.monthrange(2028, month)[1] + 1):
                text = f"{day} · {date}.{month}."
                measures = {size: measure(text, metrics) for size, metrics in fonts.items()}
                guarded_bottom = {size: max([size] + [values[index] for char, values in tails.items() if char in text])
                                  for index, size in enumerate(DATE_SIZES)}
                strings += 1
                for big in (False, True):
                    for mode in ("full", "peek", "context"):
                        for shadow in (False, True):
                            frame_width = 176 if big else 168
                            budget = frame_width - (2 if shadow else 0)
                            candidates = DATE_SIZES if big else DATE_SIZES[1:]
                            size = next((candidate for candidate in candidates if measures[candidate][0] <= budget), 18)
                            advance, left, right, top, bottom = measures[size]
                            label = f"{language}: {text}, {'Big' if big else 'normal'}, {mode}, shadow={shadow}, font={size}"
                            require(advance > 0 and advance <= budget, "Date width budget exceeded: " + label)
                            text_x = (frame_width - advance) // 2
                            require(text_x + left >= 0 and text_x + right + (1 if shadow else 0) <= frame_width,
                                    "Date glyph/shadow extends outside its text frame: " + label)
                            base_y = ((20 if big else 22) if mode == "peek" else (22 if big else 26))
                            limit = 50 if mode == "full" else 49
                            overflow = max(0, base_y + guarded_bottom[size] + (1 if shadow else 0) - limit)
                            y = base_y - overflow
                            actual_top = y + top
                            actual_bottom = y + bottom + (1 if shadow else 0)
                            require(actual_top >= 19, "Date ink touches the top bezel: " + label)
                            require(actual_bottom <= limit, "Date tail exceeds the guarded lower edge: " + label)
                            gap = minimum_clock_tops[big, mode, shadow] - actual_bottom
                            require(gap >= 6, f"Date/clock ink gap is only {gap}px: " + label)
                            minimum_gap = min(minimum_gap, gap)
                            minimum_top = min(minimum_top, actual_top)
                            checks += 1
    require(strings == 43554, "Localized date corpus count changed unexpectedly")
    return {"dateStrings": strings, "datePresentationChecks": checks, "dateFonts": len(fonts),
            "languages": len(arrays), "dateGuardMatches": True,
            "minimumDateClockGapPx": minimum_gap, "minimumDateInkTopPx": minimum_top}


def verify(pbw, root=ROOT, write_context_metrics=False):
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    header = root / "build/emery/src/resource_ids.auto.h"
    require(header.is_file(), "Build the watchface first: matching generated resource IDs are required")
    ids = {name: int(number) for name, number in re.findall(
        r"#define\s+RESOURCE_ID_(\w+)\s+(\d+)", header.read_text(encoding="utf-8"))}
    with zipfile.ZipFile(pbw) as archive:
        require(archive.testzip() is None, "PBW ZIP integrity check failed")
        appinfo = json.loads(archive.read("appinfo.json"))
        require(appinfo.get("uuid") == package["pebble"]["uuid"] and
                appinfo.get("versionLabel") == package["version"] and
                appinfo.get("targetPlatforms") == package["pebble"]["targetPlatforms"],
                "PBW metadata differs from package.json; rebuild/package the selected release")
        for name in ("app_resources.pbpack", "pebble-app.bin"):
            path = root / "build/emery" / name
            require(path.is_file() and archive.read("emery/" + name) == path.read_bytes(),
                    "PBW native payload differs from the local build: " + name)
        packed = archive.read("emery/app_resources.pbpack")
    context_header = root / "src/c/context_text_metrics.h"
    expected_context = context_metrics_header(packed, ids)
    if write_context_metrics:
        context_header.write_text(expected_context, encoding="utf-8")
    require(context_header.is_file(),
            "Context ink metadata missing; run with --write-context-metrics after building")
    require(context_header.read_text(encoding="utf-8") == expected_context,
            "Context ink metadata drift: regenerate with --write-context-metrics against the matching PBW")
    fonts = {}
    for size in CLOCK_SIZES:
        name = "FIRA_SANS_CONDENSED_BOLD_" + str(size)
        require(name in ids, "Generated resource header is missing " + name)
        fonts[size] = read_font(packed, ids[name])
    layout = (root / "src/c/watch_layout.h").read_text(encoding="utf-8")
    bounds = source_ink_bounds(layout)
    for size, metrics in fonts.items():
        actual = (min(glyph[3] for glyph in metrics.values()),
                  max(glyph[3] + glyph[1] for glyph in metrics.values()))
        require(bounds[size] == actual,
                f"Clock ink metadata drift for {size}px: C table {bounds[size]}, compiled font {actual}")
    native = (root / "src/c/halftone.c").read_text(encoding="utf-8")
    require(re.search(r"has_context\s*\?\s*88\s*:\s*108", native) is not None,
            "Big clock context cap changed; review the fitting policy")
    clocks = ([f"{hour:02d}:{minute:02d}" for hour in range(24) for minute in range(60)] +
              [f"{hour}:{minute:02d}" for hour in range(1, 13) for minute in range(60)])
    checks = 0
    selected_sizes = set()
    minimum_clock_tops = {}
    for text in clocks:
        for big in (False, True):
            for mode in ("full", "peek", "context"):
                for shadow in (False, True):
                    frame_width = 192 if big else 168
                    budget = frame_width - ((10 if shadow else 8) if big else (4 if shadow else 2))
                    if mode == "peek":
                        size = 72 if big else 64
                    elif big:
                        cap = 88 if mode == "context" else 108
                        size = next((candidate for candidate in reversed(CLOCK_SIZES)
                                     if 80 <= candidate <= cap and measure(text, fonts[candidate])[0] <= budget), 72)
                    else:
                        size = 76 if measure(text, fonts[76])[0] <= budget else 64
                    advance, left, right, top, bottom = measure(text, fonts[size])
                    label = f"{text}, {'Big' if big else 'normal'}, {mode}, shadow={shadow}, font={size}"
                    require(advance <= budget and advance + (4 if shadow else 2) <= frame_width,
                            "Clock width/shadow allowance exceeded: " + label)
                    text_x = (frame_width - advance) // 2
                    require(text_x + left >= 0 and text_x + right + (2 if shadow else 0) <= frame_width,
                            "Clock glyph/shadow extends outside its text frame: " + label)
                    center = 96 if mode == "full" else 88
                    font_top, font_bottom = bounds[size]
                    y = center - (font_top + font_bottom) // 2
                    # These bands reserve room for the date above and the
                    # two-reading row below; native capture checks stay separate.
                    lower = {"full": 140, "context": 124, "peek": 121}[mode]
                    require(y + top >= 52 and y + bottom + (2 if shadow else 0) <= lower,
                            "Clock ink leaves its vertical layout budget: " + label)
                    key = (big, mode, shadow)
                    minimum_clock_tops[key] = min(minimum_clock_tops.get(key, sys.maxsize), y + top)
                    selected_sizes.add(size)
                    checks += 1
    result = {"clockStrings": len(clocks), "presentations": 12, "fitChecks": checks,
              "compiledFonts": len(fonts), "selectedFontSizes": sorted(selected_sizes),
              "inkBoundsMatch": True, "nativePayloadMatchesBuild": True,
              "contextGlyphs": 205, "contextFonts": len(CONTEXT_SIZES),
              "contextInkBoundsMatch": True, "contextFallbackPolicy": "emojiBaselineOtherwiseWildcard"}
    result.update(verify_dates(packed, ids, native, layout, minimum_clock_tops))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pbw", type=Path, required=True, help="Final permission-packaged PBW")
    parser.add_argument("--write-context-metrics", action="store_true",
                        help="Regenerate src/c/context_text_metrics.h from the matching compiled fonts")
    args = parser.parse_args()
    try:
        result = verify(args.pbw, write_context_metrics=args.write_context_metrics)
    except (OSError, ValueError, KeyError, struct.error, zipfile.BadZipFile) as error:
        parser.exit(1, "Clock font check failed: " + str(error) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
