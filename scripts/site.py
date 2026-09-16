"""Standard-library-only, explicit-file static site preview and release builder."""
import argparse
import functools
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
import tempfile
from urllib.parse import unquote, urlsplit
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "deploy/public-files.txt"
ALLOWED_SUFFIXES = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff2"}


def public_files():
    entries = [s.strip() for s in MANIFEST.read_text().splitlines() if s.strip() and not s.lstrip().startswith("#")]
    if len(entries) != len(set(entries)) or "index.html" not in entries:
        raise ValueError("Manifest must be unique and include index.html")
    for name in entries:
        path = PurePosixPath(name)
        if path.is_absolute() or any(p.startswith(".") for p in path.parts) or "\\" in name or str(path) != name:
            raise ValueError(f"Unsafe manifest path: {name}")
        if path.suffix.lower() not in ALLOWED_SUFFIXES:
            raise ValueError(f"Non-public file type: {name}")
        candidate = ROOT / name
        if any(p.is_symlink() for p in [candidate, *candidate.parents] if p != ROOT and ROOT in p.parents):
            raise ValueError(f"Symlink not allowed: {name}")
        if not candidate.is_file() or not candidate.resolve().is_relative_to(ROOT):
            raise ValueError(f"Missing or escaped public file: {name}")
    return entries


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in {"src", "href"}:
                self.references.append(value)


def check():
    entries = public_files()
    for name in entries:
        if name.endswith(".html"):
            parser = References()
            parser.feed((ROOT / name).read_text())
            for ref in parser.references:
                url = urlsplit(ref)
                if url.scheme or url.netloc or not url.path or url.path == "./":
                    continue
                target = unquote(url.path).lstrip("/")
                if target not in entries:
                    raise ValueError(f"{name}: reference not in public manifest: {ref}")
    return entries


def build():
    entries = check()
    output_root = ROOT / "dist"
    if output_root.is_symlink():
        raise ValueError("Refusing symlinked dist directory")
    output_root.mkdir(exist_ok=True)
    # Unique immutable snapshot avoids competing previews overwriting one another.
    output = Path(tempfile.mkdtemp(prefix="site-", dir=output_root))
    hashes = {}
    for name in entries:
        data = (ROOT / name).read_bytes()
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        hashes[name] = hashlib.sha256(data).hexdigest()
    # Sidecar is deliberately outside the served artifact.
    output.with_suffix(".sha256.json").write_text(json.dumps(hashes, indent=2) + "\n")
    return output


class PreviewHandler(SimpleHTTPRequestHandler):
    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["check", "build", "serve"])
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()
    if args.command == "check":
        print(f"OK: {len(check())} explicitly allowed public files")
        return
    output = build()
    print(output, flush=True)
    if args.command == "serve":
        handler = functools.partial(PreviewHandler, directory=str(output))
        with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
            print(f"Preview: http://localhost:{args.port} (snapshot; restart after edits)", flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass


if __name__ == "__main__":
    main()
