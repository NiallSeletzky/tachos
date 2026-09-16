"""Boundary checks: prevent accidental private files entering public artifacts."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import functools
import threading
from urllib.request import urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location("tachos_site", Path(__file__).with_name("site.py"))
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class PublicBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.old_root, self.old_manifest = site.ROOT, site.MANIFEST
        self.addCleanup(self.restore)
        site.ROOT = self.root
        site.MANIFEST = self.root / "manifest.txt"
        (self.root / "index.html").write_text('<html><body>Test</body></html>')
        site.MANIFEST.write_text("index.html\n")

    def restore(self):
        site.ROOT, site.MANIFEST = self.old_root, self.old_manifest

    def test_private_files_excluded_and_snapshots_independent(self):
        (self.root / ".env").write_text("TEST_ONLY=not-a-secret")
        (self.root / "notes.md").write_text("Not public")
        first, second = site.build(), site.build()
        self.assertNotEqual(first, second)
        self.assertEqual([p.name for p in first.iterdir()], ["index.html"])
        self.assertTrue(first.with_suffix(".sha256.json").is_file())

    def test_unsafe_manifest_paths(self):
        for name in ["../outside.js", "/absolute.js", ".env", "notes.md", "assets/../index.html"]:
            with self.subTest(name=name):
                site.MANIFEST.write_text("index.html\n" + name + "\n")
                with self.assertRaises(ValueError):
                    site.check()

    def test_symlink_rejected(self):
        (self.root / "alias.html").symlink_to(self.root / "index.html")
        site.MANIFEST.write_text("index.html\nalias.html\n")
        with self.assertRaises(ValueError):
            site.check()

    def test_unlisted_asset_rejected(self):
        (self.root / "index.html").write_text('<img src="private.png">')
        with self.assertRaises(ValueError):
            site.check()

    def test_http_serves_only_artifact(self):
        output = site.build()
        handler = functools.partial(site.PreviewHandler, directory=str(output))
        with site.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                base = f"http://127.0.0.1:{server.server_port}"
                with urlopen(base + "/") as response:
                    self.assertEqual(response.status, 200)
                for path in ["/AGENTS.md", "/.git/config", "/.env", "/scripts/site.py"]:
                    with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                        urlopen(base + path)
                    self.assertEqual(error.exception.code, 404)
            finally:
                server.shutdown()
                worker.join()


if __name__ == "__main__":
    unittest.main()
