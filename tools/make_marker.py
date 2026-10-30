"""Makes the printable QR marker: 10 cm square, box art border, 6 cm QR with the logo.

Usage: tools/.venv/Scripts/python tools/make_marker.py [asset_dir]
Exits non-zero if OpenCV cannot decode the URL back from the image.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
import qrcode
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8")

URL = "https://peerapath.github.io/stuchergrade-ar/"
ROOT = Path(__file__).resolve().parents[1]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\Users\Benz\Downloads\asset")
OUT = ROOT / "marker"
DPI = 300
PX_PER_CM = DPI / 2.54
SIZE = round(10 * PX_PER_CM)      # 1181 px marker
QR_SIDE = round(6 * PX_PER_CM)    # 709 px QR incl. quiet zone
PANEL = (288, 347, 1712, 1066)    # centre panel of ลายหน้ากล่อง
LOGO_BOX = (755, 530, 1205, 795)  # StuCher Grade logo inside ลายหน้ากล่อง
LOGO_WIDTH = round(QR_SIDE * 0.25)


def build_marker():
    front = Image.open(SRC / "ลายหน้ากล่อง.png").convert("RGB")
    panel = front.crop(PANEL)
    side = panel.height
    left = (panel.width - side) // 2
    marker = panel.crop((left, 0, left + side, side)).resize((SIZE, SIZE), Image.LANCZOS)

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=4, box_size=10)
    qr.add_data(URL)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB").resize((QR_SIDE, QR_SIDE), Image.NEAREST)

    logo = front.crop(LOGO_BOX)
    logo = logo.resize((LOGO_WIDTH, round(LOGO_WIDTH * logo.height / logo.width)), Image.LANCZOS)
    pad = 8
    plate = Image.new("RGB", (logo.width + 2 * pad, logo.height + 2 * pad), "white")
    plate.paste(logo, (pad, pad))
    qr_img.paste(plate, ((QR_SIDE - plate.width) // 2, (QR_SIDE - plate.height) // 2))

    offset = (SIZE - QR_SIDE) // 2
    frame = Image.new("RGB", (QR_SIDE + 24, QR_SIDE + 24), "white")
    mask = Image.new("L", frame.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *frame.size), radius=24, fill=255)
    marker.paste(frame, (offset - 12, offset - 12), mask)
    marker.paste(qr_img, (offset, offset))
    return marker


def check_decodes(marker):
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.cvtColor(np.asarray(marker), cv2.COLOR_RGB2BGR))
    if data != URL:
        raise SystemExit(f"QR self-check failed: decoded {data!r}")
    print(f"QR decodes to {data}")


def write_pdf(marker):
    a4 = Image.new("RGB", (round(21 * PX_PER_CM), round(29.7 * PX_PER_CM)), "white")
    x = (a4.width - SIZE) // 2
    y = round(3 * PX_PER_CM)
    a4.paste(marker, (x, y))
    draw = ImageDraw.Draw(a4)
    draw.rectangle((x - 1, y - 1, x + SIZE, y + SIZE), outline="black")
    font = ImageFont.load_default(size=36)
    draw.text((x, y + SIZE + 30), "Print at 100% (actual size). Marker width = 10 cm.", fill="black", font=font)
    a4.save(OUT / "stuchergrade-marker.pdf", resolution=DPI)


def main():
    OUT.mkdir(exist_ok=True)
    marker = build_marker()
    check_decodes(marker)
    marker.save(OUT / "stuchergrade-marker.png", dpi=(DPI, DPI))
    write_pdf(marker)
    print("marker written")


if __name__ == "__main__":
    main()
