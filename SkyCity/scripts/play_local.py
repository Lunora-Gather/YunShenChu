"""Serve the unpacked web game from its stable loopback address."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
from subprocess import run
from urllib.request import ProxyHandler, build_opener


SITE = Path(__file__).resolve().parent.parent / "site"
HOST = "127.0.0.1"
DEFAULT_PORT = 4187


class GameHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        # Reproducible ZIPs share a fixed file timestamp across releases.
        del self.headers["If-Modified-Since"]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def same_release_at(address, expected_index):
    try:
        opener = build_opener(ProxyHandler({}))
        with opener.open(address, timeout=3) as response:
            return (
                response.geturl() == address
                and response.read(len(expected_index) + 1) == expected_index
            )
    except OSError:
        return False


def open_safari(address, serve_only):
    if not serve_only:
        run(["/usr/bin/open", "-a", "Safari", address], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serve-only", action="store_true", help="Keep serving without opening Safari.")
    args = parser.parse_args()

    try:
        port = int(os.environ.get("YUNSHENCHU_PORT", DEFAULT_PORT))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        raise SystemExit("YUNSHENCHU_PORT 必须是 1 到 65535 的整数。")

    try:
        index = (SITE / "index.html").read_bytes()
    except OSError:
        raise SystemExit("请解压整个游戏文件夹后再启动《云深处》。")

    address = f"http://{HOST}:{port}/"
    handler = partial(GameHandler, directory=SITE)
    try:
        server = ThreadingHTTPServer((HOST, port), handler)
    except OSError as error:
        if not same_release_at(address, index):
            raise SystemExit(f"无法在 {address} 启动《云深处》。{error}")
        print(f"《云深处》已在运行 · {address}", flush=True)
        open_safari(address, args.serve_only)
        return

    with server:
        print(f"《云深处》已启动 · {address}\n游玩时请保留这个窗口。", flush=True)
        try:
            open_safari(address, args.serve_only)
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
