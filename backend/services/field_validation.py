"""Shared field validation for dynamic stage submissions."""
import base64
import re
from typing import Any, Dict, List, Optional


def sanitize_file_value_for_client(value: Any, field_id: str = "") -> Any:
    """Replace embedded data-URL blobs with lightweight metadata for API responses."""
    if isinstance(value, str) and value.startswith("data:"):
        semi = value.find(";")
        mime = value[5:semi] if semi > 5 else "application/octet-stream"
        ext = mime.split("/")[-1] if "/" in mime else "file"
        label = (field_id or "upload").replace("_", " ").strip() or "upload"
        return {
            "_stored_file": True,
            "mime": mime,
            "size": len(value),
            "filename": f"{label}.{ext}",
        }
    return value


def sanitize_submission_data_for_client(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    return {key: sanitize_file_value_for_client(val, str(key)) for key, val in data.items()}

MIME_BY_EXT = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "zip": "application/zip",
    "csv": "text/csv",
    "txt": "text/plain",
}


def normalize_stage_fields(raw_fields: List[dict]) -> List[dict]:
    if not isinstance(raw_fields, list):
        return []
    normalized = []
    for field in raw_fields:
        if not isinstance(field, dict):
            continue
        fid = field.get("field_id") or field.get("id") or field.get("name") or field.get("label")
        ftype = str(field.get("field_type") or field.get("type") or "text").lower()
        accept = field.get("accept_types") or field.get("acceptTypes") or []
        if ftype == "file" and not accept:
            label = str(field.get("label") or "").lower()
            if "pdf" in label and "ppt" not in label:
                accept = [".pdf"]
            elif "ppt" in label:
                accept = [".ppt", ".pptx"]
        normalized.append({
            **field,
            "field_id": str(fid or ""),
            "field_type": ftype,
            "accept_types": [str(a) for a in accept] if isinstance(accept, list) else [],
        })
    return normalized


def _ext_from_accept(token: str) -> str:
    t = str(token or "").strip().lower()
    if t.startswith("."):
        return t[1:]
    if "/" in t:
        for ext, mime in MIME_BY_EXT.items():
            if mime == t:
                return ext
    return t.replace(".", "")


def file_matches_accept_types(filename: str, mime_type: str, accept_types: List[str]) -> bool:
    if not accept_types:
        return True
    file_ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    mime_lower = (mime_type or "").lower()
    for raw in accept_types:
        allowed = _ext_from_accept(raw)
        if not allowed:
            continue
        if file_ext == allowed:
            return True
        expected_mime = MIME_BY_EXT.get(allowed, "")
        if expected_mime and expected_mime in mime_lower:
            return True
        if allowed == "pdf" and "pdf" in mime_lower:
            return True
        if allowed in ("ppt", "pptx") and ("presentation" in mime_lower or "powerpoint" in mime_lower):
            return True
    return False


def parse_data_url(value: str) -> Optional[Dict[str, str]]:
    if not isinstance(value, str) or not value.startswith("data:"):
        return None
    match = re.match(r"data:([^;]+);base64,(.+)", value, re.DOTALL)
    if not match:
        return None
    return {"mime": match.group(1), "data": match.group(2)}


def validate_file_value(value: Any, accept_types: List[str], label: str = "File") -> Optional[str]:
    if value is None or value == "":
        return None
    if isinstance(value, str) and value.startswith("http"):
        return None
    if not accept_types:
        return None
    if not isinstance(value, str):
        return f"{label}: invalid file data"
    parsed = parse_data_url(value)
    if not parsed:
        return f"{label}: invalid file upload format"
    try:
        raw = base64.b64decode(parsed["data"], validate=True)
    except Exception:
        return f"{label}: corrupted file data"
    if len(raw) > 25 * 1024 * 1024:
        return f"{label}: file exceeds 25MB limit"
    # sniff simple magic bytes
    mime = parsed["mime"]
    ext_guess = ""
    if raw[:4] == b"%PDF":
        ext_guess, mime = "pdf", "application/pdf"
    elif raw[:8] == b"\x89PNG\r\n\x1a\n":
        ext_guess, mime = "png", "image/png"
    elif raw[:2] == b"\xff\xd8":
        ext_guess, mime = "jpeg", "image/jpeg"
    elif raw[:2] == b"PK":
        if "ppt" in str(accept_types).lower():
            ext_guess = "pptx"
    fake_name = f"upload.{ext_guess}" if ext_guess else "upload.bin"
    if not file_matches_accept_types(fake_name, mime, accept_types):
        allowed = ", ".join(accept_types)
        return f"{label}: file type not allowed. Allowed: {allowed}"
    return None
