import argparse
import hashlib
import json
import os
import shutil
import sys
from typing import Any, Dict, List

try:
    import pymupdf  # PyMuPDF
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import pytesseract
    from pytesseract import Output
except ImportError:
    pytesseract = None


def find_tesseract_binary() -> str | None:
    """Finds tesseract executable on Windows or system PATH."""
    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        shutil.which("tesseract"),
    ]
    for c in candidates:
        if c and os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    return None


# Initialize tesseract cmd if found
tess_cmd = find_tesseract_binary()
if tess_cmd and pytesseract:
    pytesseract.pytesseract.tesseract_cmd = tess_cmd


def ocr_image(img: Image.Image) -> tuple[str, float]:
    """Runs Tesseract OCR on a PIL Image and returns extracted text and average confidence (0-100)."""
    if not pytesseract or not tess_cmd:
        return "", 0.0

    try:
        # Preprocessing: convert to grayscale for sharper OCR
        gray = img.convert("L")
        data = pytesseract.image_to_data(gray, output_type=Output.DICT)
        words = []
        confidences = []
        for i, text in enumerate(data.get("text", [])):
            text = text.strip()
            conf = data.get("conf", [])[i]
            if text and conf != "-1":
                try:
                    c_val = float(conf)
                    if c_val > 0:
                        words.append(text)
                        confidences.append(c_val)
                except ValueError:
                    pass

        extracted = " ".join(words)
        mean_conf = sum(confidences) / len(confidences) if confidences else 0.0
        return extracted, round(mean_conf, 1)
    except Exception as e:
        sys.stderr.write(f"OCR failed: {e}\n")
        return "", 0.0


def hash_content(text: str) -> str:
    """Calculates normalized MD5 hash of text to detect identical duplicate pages."""
    cleaned = "".join(text.split()).lower()
    return hashlib.md5(cleaned.encode("utf-8")).hexdigest() if len(cleaned) > 20 else ""


def process_pdf(file_path: str) -> Dict[str, Any]:
    if not pymupdf:
        raise RuntimeError("PyMuPDF is not installed. Run 'pip install pymupdf'")

    doc = pymupdf.open(file_path)
    page_count = len(doc)
    pages: List[Dict[str, Any]] = []
    full_text_parts: List[str] = []
    seen_hashes = set()
    duplicate_detected = False
    total_confidences: List[float] = []

    for idx, page in enumerate(doc):
        p_num = idx + 1
        # 1. Try native PDF text extraction
        native_text = page.get_text("text").strip()
        word_count = len(native_text.split())
        conf = 98.0  # Native text has essentially 98-100% confidence
        page_text = native_text

        # 2. If native text is empty or very sparse (< 10 words) and page contains images, run OCR
        if word_count < 10 and (pytesseract and tess_cmd):
            pix = page.get_pixmap(dpi=150)
            if Image:
                import io
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_text, ocr_conf = ocr_image(img)
                if len(ocr_text.split()) > word_count:
                    page_text = ocr_text
                    word_count = len(ocr_text.split())
                    conf = ocr_conf

        total_confidences.append(conf)
        full_text_parts.append(page_text)

        # Duplicate check
        h = hash_content(page_text)
        if h:
            if h in seen_hashes:
                duplicate_detected = True
            seen_hashes.add(h)

        preview = page_text[:200] + ("..." if len(page_text) > 200 else "")
        pages.append({
            "page": p_num,
            "word_count": word_count,
            "confidence": round(conf, 1),
            "preview": preview,
        })

    doc.close()

    total_words = sum(p["word_count"] for p in pages)
    mean_conf = sum(total_confidences) / len(total_confidences) if total_confidences else 0.0

    return {
        "format": "pdf",
        "page_count": page_count,
        "total_words": total_words,
        "mean_confidence": round(mean_conf, 1),
        "is_duplicate_detected": duplicate_detected,
        "is_empty": total_words < 5,
        "pages": pages,
        "full_text": "\n\n--- Page Break ---\n\n".join(full_text_parts),
    }


def process_image(file_path: str) -> Dict[str, Any]:
    if not Image:
        raise RuntimeError("Pillow is not installed. Run 'pip install pillow'")

    img = Image.open(file_path)
    ocr_text, conf = ocr_image(img)
    word_count = len(ocr_text.split())

    preview = ocr_text[:200] + ("..." if len(ocr_text) > 200 else "")

    return {
        "format": "image",
        "page_count": 1,
        "total_words": word_count,
        "mean_confidence": conf,
        "is_duplicate_detected": false if "false" in locals() else False,
        "is_empty": word_count < 5,
        "pages": [
            {
                "page": 1,
                "word_count": word_count,
                "confidence": conf,
                "preview": preview,
            }
        ],
        "full_text": ocr_text,
    }


def main():
    parser = argparse.ArgumentParser(description="PledgePay Document Proof Verifier")
    parser.add_argument("--file", required=True, help="Path to PDF or image proof document")
    parser.add_argument("--target-pages", type=int, default=1, help="Target pages expected")
    parser.add_argument("--target-words", type=int, default=0, help="Target words expected")

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(json.dumps({"error": f"File not found: {args.file}"}))
        sys.exit(1)

    ext = os.path.splitext(args.file)[1].lower()
    try:
        if ext in [".pdf"]:
            res = process_pdf(args.file)
        elif ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
            res = process_image(args.file)
        else:
            print(json.dumps({"error": f"Unsupported file extension: {ext}. Upload PDF or image."}))
            sys.exit(1)

        res["target_pages"] = args.target_pages
        res["target_words"] = args.target_words
        res["pages_met"] = res["page_count"] >= args.target_pages
        res["words_met"] = args.target_words <= 0 or res["total_words"] >= args.target_words
        res["ocr_engine"] = "PyMuPDF + Tesseract OCR" if tess_cmd else "PyMuPDF Native Engine"

        print(json.dumps(res, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
