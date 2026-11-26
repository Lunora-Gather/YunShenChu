"""Package a Vite production build as a verified, reproducible ZIP."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import stat
from tempfile import TemporaryDirectory
from urllib.parse import unquote, urlsplit
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ARCHIVE_ROOT = "The-Deep-Cloud"
DEFAULT_OUTPUT = PROJECT_ROOT / "release" / f"{ARCHIVE_ROOT}.zip"
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
REMOTE_STYLE = re.compile(r"""(?:url\(|@import\s+)\s*['"]?(?:https?:)?//""", re.IGNORECASE)


class EntryAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.module_sources = []
        self.links = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == "script" and attributes.get("type") == "module" and attributes.get("src"):
            self.module_sources.append(attributes["src"])
        if tag == "link" and attributes.get("rel") in {"stylesheet", "modulepreload", "icon"}:
            if attributes.get("href"):
                self.links.append(attributes["href"])


def check_build(site):
    entry = EntryAssets()
    entry.feed((site / "index.html").read_text(encoding="utf-8"))
    if not entry.module_sources:
        raise ValueError("dist/index.html does not contain a module entry point")

    for reference in [*entry.module_sources, *entry.links]:
        url = urlsplit(reference)
        path = Path(unquote(url.path))
        asset = (site / path).resolve()
        if url.scheme or url.netloc or path.is_absolute() or not asset.is_relative_to(site):
            raise ValueError(f"Build asset must be relative to dist: {reference}")
        if not asset.is_file() or asset.stat().st_size == 0:
            raise ValueError(f"Missing or empty build asset: {reference}")

    files = sorted(site.rglob("*"))
    if any(path.is_symlink() for path in files):
        raise ValueError("dist must contain regular release files only")
    files = [path for path in files if path.is_file()]
    for path in files:
        if path.suffix == ".css" and REMOTE_STYLE.search(path.read_text(encoding="utf-8")):
            raise ValueError(f"Release styles must use local assets: {path.relative_to(site)}")
    return files


def build_zip(site, output):
    if output.suffix.lower() != ".zip" or output.is_relative_to(site):
        raise ValueError("Choose a .zip output outside dist")

    scripts = PROJECT_ROOT / "scripts"
    entries = {
        "打开云深处.command": (scripts / "launch.command", 0o755),
        "开始游玩.txt": (scripts / "release-guide.txt", 0o644),
        "tools/play_local.py": (scripts / "play_local.py", 0o644),
        **{
            f"site/{path.relative_to(site).as_posix()}": (path, 0o644)
            for path in check_build(site)
        },
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix=".package-", dir=output.parent) as temp_dir:
        staged_zip = Path(temp_dir) / output.name
        with ZipFile(staged_zip, "w") as archive:
            for name, (source, permissions) in sorted(entries.items()):
                info = ZipInfo(f"{ARCHIVE_ROOT}/{name}", ZIP_TIMESTAMP)
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | permissions) << 16
                archive.writestr(info, source.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)

        with ZipFile(staged_zip) as archive:
            corrupt_file = archive.testzip()
            if corrupt_file:
                raise ValueError(f"Invalid ZIP checksum for {corrupt_file}")

        staged_zip.replace(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    output = parser.parse_args().output.resolve()
    try:
        build_zip((PROJECT_ROOT / "dist").resolve(), output)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Release packaging failed: {error}\n")

    print(f"Verified release: {output} ({output.stat().st_size / 1024**2:.1f} MiB)")


if __name__ == "__main__":
    main()
