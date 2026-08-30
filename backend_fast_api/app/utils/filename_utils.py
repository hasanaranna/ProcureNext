import re
import urllib.parse
from pathlib import Path

def sanitize_filename(org_name: str, doc_name: str, ext: str) -> str:
    """
    Generate a sanitized filename from organization name and document name.
    Spaces are replaced with underscores. Special characters are removed.
    """
    # Fallbacks in case None or empty is provided
    org_name = (org_name or "Unknown_Org").strip()
    doc_name = (doc_name or "Document").strip()

    # Replace spaces with underscores
    org_name = org_name.replace(" ", "_")
    doc_name = doc_name.replace(" ", "_")

    # Remove invalid characters (anything not alphanumeric, underscore, or dash)
    org_name = re.sub(r'[^a-zA-Z0-9_-]', '', org_name)
    doc_name = re.sub(r'[^a-zA-Z0-9_-]', '', doc_name)

    # Clean up multiple underscores
    org_name = re.sub(r'_+', '_', org_name).strip('_')
    doc_name = re.sub(r'_+', '_', doc_name).strip('_')

    # Default if everything got stripped
    if not org_name:
        org_name = "Org"
    if not doc_name:
        doc_name = "Document"

    # Ensure extension starts with a dot if provided
    if ext and not ext.startswith('.'):
        ext = f".{ext}"
        
    return f"{org_name}_{doc_name}{ext}"

def get_content_disposition(filename: str, disposition_type: str = "attachment") -> str:
    """
    Generate a Content-Disposition header value with proper RFC 5987 encoding
    for extended character support.
    """
    encoded_filename = urllib.parse.quote(filename)
    # The standard format specifies both a regular filename and a UTF-8 encoded one.
    return f'{disposition_type}; filename="{filename}"; filename*=UTF-8\'\'{encoded_filename}'
