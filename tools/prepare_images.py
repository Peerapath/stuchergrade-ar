"""Cuts cards out of the print sheets, writes box textures and the card manifest.

Usage: tools/.venv/Scripts/python tools/prepare_images.py [asset_dir]
"""
import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\Users\Benz\Downloads\asset")
CARDS = ROOT / "assets" / "cards"
BUILD = ROOT / "tools" / "build"
CARD_SIZE = (384, 658)  # 7:12
BG_TOLERANCE = 40        # summed RGB distance from the sheet's grey background
DEDUPE_THRESHOLD = 6.0   # mean abs grey difference of 16x27 thumbnails
GOOD = ["การ์ดกิจกรรม"] + [f"การ์ดจะทำ{i}" for i in range(1, 6)] + ["การ์ดนักเรียน1", "การ์ดนักเรียน2"]
BAD = [f"เหตการ์{i}" for i in range(1, 5)] + [f"การ์ดก่อกวน{i}" for i in range(1, 6)]
BOX = {"box_front": "ลายหน้ากล่อง", "box_back": "ลายหลังกล่อง", "box_inside": "ลายด้านในกล่อง"}


def runs(flags, min_len):
    out, start = [], None
    for i, on in enumerate(list(flags) + [False]):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def crop_cards(path):
    image = Image.open(path).convert("RGB")
    a = np.asarray(image).astype(int)
    mask = np.abs(a - a[3, 3]).sum(axis=2) > BG_TOLERANCE
    rows = runs(mask.mean(axis=1) > 0.05, 100)
    cols = runs(mask.mean(axis=0) > 0.05, 100)
    cards = []
    for r0, r1 in rows:
        for c0, c1 in cols:
            cell = mask[r0:r1, c0:c1]
            if cell.mean() < 0.5:
                continue
            ys, xs = np.nonzero(cell)
            box = (c0 + xs.min(), r0 + ys.min(), c0 + xs.max() + 1, r0 + ys.max() + 1)
            cards.append(image.crop(box).resize(CARD_SIZE, Image.LANCZOS))
    if not cards:
        raise SystemExit(f"no cards found in {path.name}")
    return cards


def dedupe(images):
    kept, prints = [], []
    for im in images:
        fp = np.asarray(im.convert("L").resize((16, 27), Image.BILINEAR)).astype(float)
        if any(np.abs(fp - other).mean() < DEDUPE_THRESHOLD for other in prints):
            continue
        kept.append(im)
        prints.append(fp)
    return kept


def contact_sheet(images, path):
    cols = 8
    w, h = CARD_SIZE[0] // 2, CARD_SIZE[1] // 2
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), "white")
    for i, im in enumerate(images):
        sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
    sheet.save(path, quality=80)


def write_pile(name, sheet_names):
    out_dir = CARDS / name
    out_dir.mkdir(parents=True)
    cards = []
    for sheet in sheet_names:
        found = crop_cards(SRC / f"{sheet}.png")
        unique = dedupe(found)
        print(f"{sheet}: {len(found)} cards on sheet, {len(unique)} unique")
        cards.extend(unique)
    cards = dedupe(cards)
    paths = []
    for i, im in enumerate(cards):
        p = out_dir / f"{name}_{i:02d}.jpg"
        im.save(p, quality=85)
        paths.append(p.relative_to(ROOT).as_posix())
    contact_sheet(cards, BUILD / f"contact_{name}.jpg")
    print(f"{name}: {len(paths)} cards")
    return paths


def main():
    shutil.rmtree(CARDS, ignore_errors=True)
    CARDS.mkdir(parents=True)
    BUILD.mkdir(parents=True, exist_ok=True)
    crop_cards(SRC / "หลังการ์ด.png")[0].save(CARDS / "back.jpg", quality=85)
    manifest = {"back": "assets/cards/back.jpg", "good": write_pile("good", GOOD), "bad": write_pile("bad", BAD)}
    (CARDS / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    for out_name, src_name in BOX.items():
        Image.open(SRC / f"{src_name}.png").convert("RGB").save(BUILD / f"{out_name}.jpg", quality=85)
    print("done")


if __name__ == "__main__":
    main()
