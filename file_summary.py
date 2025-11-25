from pathlib import Path
import re


def _clean_text(text: str) -> str:
    """Remove binary-looking noise, XML/markup, and non-printable chars."""
    text = text.replace("\x00", " ")
    # Strip XML/HTML tags and common zip headers accidentally read as text
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("PK\x03\x04", " ")
    # Remove very long base64-like runs that are unlikely to be meaningful text
    text = re.sub(r"[A-Za-z0-9+/=]{80,}", " ", text)
    # Keep printable characters only, normalize whitespace
    text = "".join(ch if ch.isprintable() else " " for ch in text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def summarize_text(extracted_text: str, max_len: int = 600) -> str:
    """
    Summarize already extracted text, ignoring binary/XML noise.
    Returns a concise snippet or a fallback if nothing readable is found.
    """
    cleaned = _clean_text(extracted_text)
    if not cleaned:
        return "Unable to extract readable text from the document."

    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 3].rstrip() + "..."
    return cleaned


def summarize_file(path: Path, max_len: int = 600) -> str:
    """
    Read a file and summarize its readable content.
    If the file is unreadable or contains only binary garbage, return a fallback.
    """
    try:
        # Read a limited chunk to avoid loading very large files
        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            snippet = handle.read(5000)
    except (OSError, UnicodeDecodeError) as exc:
        return f"Unable to summarize: {exc}"

    return summarize_text(snippet, max_len=max_len)
