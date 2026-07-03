#!/usr/bin/env python3
"""Optional: upload a generated short (and its .json sidecar) to YouTube.

This is intentionally separate from the generator because publishing needs a
one-time Google OAuth setup that the video pipeline does not.

Setup (once)
------------
1. Create a Google Cloud project and enable the "YouTube Data API v3".
2. Create an OAuth client ID (type: Desktop app) and download it as
   ``client_secret.json`` into this folder.
3. pip install google-api-python-client google-auth-oauthlib

Usage
-----
    python upload_youtube.py out/dogshort-0001.mp4
    python upload_youtube.py out/dogshort-0001.mp4 --privacy public

The first run opens a browser to authorize; the token is cached in
``token.json`` for subsequent uploads (so a scheduler can run unattended).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def _service():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
    except ImportError:
        sys.exit(
            "Missing deps. Run:\n"
            "  pip install google-api-python-client google-auth-oauthlib"
        )

    token = Path("token.json")
    creds = None
    if token.exists():
        creds = Credentials.from_authorized_user_file(str(token), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            secret = Path("client_secret.json")
            if not secret.exists():
                sys.exit("client_secret.json not found — see setup in this file's docstring.")
            creds = InstalledAppFlow.from_client_secrets_file(
                str(secret), SCOPES
            ).run_local_server(port=0)
        token.write_text(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def upload(video: Path, privacy: str) -> str:
    from googleapiclient.http import MediaFileUpload

    sidecar = video.with_suffix(".json")
    meta = json.loads(sidecar.read_text()) if sidecar.exists() else {}
    title = meta.get("title", "What cute dog are you choosing? 🐶")
    # #Shorts in the title/description helps YouTube classify it as a Short.
    if "#shorts" not in title.lower():
        title = f"{title} #Shorts"

    body = {
        "snippet": {
            "title": title[:100],
            "description": meta.get("description", ""),
            "tags": meta.get("tags", []),
            "categoryId": meta.get("categoryId", "15"),
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }
    service = _service()
    media = MediaFileUpload(str(video), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  uploading… {int(status.progress() * 100)}%")
    vid = response["id"]
    print(f"✅ https://youtube.com/shorts/{vid}")
    return vid


def main() -> int:
    p = argparse.ArgumentParser(description="Upload a generated short to YouTube.")
    p.add_argument("video", type=Path)
    p.add_argument("--privacy", default="private",
                   choices=["private", "unlisted", "public"],
                   help="Visibility on upload (default: private — review before going public).")
    args = p.parse_args()
    if not args.video.exists():
        sys.exit(f"No such file: {args.video}")
    upload(args.video, args.privacy)
    return 0


if __name__ == "__main__":
    sys.exit(main())
