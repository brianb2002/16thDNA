#!/usr/bin/env python3
"""XVI DNA holo desk: local launcher.

Serves this folder on http://localhost and opens the app in your browser.
It also relays Coinbase's public market data (read-only, no keys) so the
full product list, futures and perps load even though Coinbase's brokerage
market API doesn't allow direct browser requests.

Usage:  python3 serve.py [port] [--no-browser]   (default port 8765; flags may come in any order)
Stop:   Ctrl+C
"""
import http.server, socketserver, urllib.request, urllib.error, os, sys, webbrowser, threading

ROOT = os.path.realpath(os.path.dirname(os.path.abspath(__file__)))
UPSTREAM = {
    "/__cb/brokerage/": "https://api.coinbase.com/api/v3/brokerage/market/",
    "/__cb/exchange/": "https://api.exchange.coinbase.com/",
}
INJECT = b'<script>window.XVI_PROXY="/__cb";</script>'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, fmt, *args):
        pass  # keep the console quiet

    def do_GET(self):
        for prefix, base in UPSTREAM.items():
            if self.path.startswith(prefix):
                return self.relay(base + self.path[len(prefix):])
        path = self.path.split("?", 1)[0]
        if path.endswith("/"):
            path += "index.html"
        fp = os.path.realpath(os.path.join(ROOT, path.lstrip("/")))
        if path.endswith(".html") and fp.startswith(ROOT + os.sep) and os.path.isfile(fp):
            with open(fp, "rb") as f:
                html = f.read()
            html = html.replace(b"<head>", b"<head>" + INJECT, 1)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(html)
            return
        return super().do_GET()

    def relay(self, url):
        req = urllib.request.Request(url, headers={"User-Agent": "XVI-DNA-launcher", "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                body, code, ctype = r.read(), r.status, r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            body, code, ctype = e.read(), e.code, "application/json"
        except Exception as e:
            body, code, ctype = (b'{"error":"%s"}' % str(e).encode()[:200]), 502, "application/json"
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    try:
        port = int(args[0]) if args else 8765
    except ValueError:
        print("Usage: python3 serve.py [port] [--no-browser]"); sys.exit(2)
    for p in range(port, port + 20):
        try:
            srv = Server(("127.0.0.1", p), Handler)
            break
        except OSError:
            continue
    else:
        print("No free port found near", port); sys.exit(1)
    url = "http://localhost:%d/" % srv.server_address[1]
    if srv.server_address[1] != port:
        print("Port %d is busy, so XVI DNA is using port %d instead. Settings saved in the browser are tied to the port." % (port, srv.server_address[1]), flush=True)
    print("XVI DNA is running at", url, "\nLeave this window open. Press Ctrl+C to stop.", flush=True)
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
