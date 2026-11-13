#!/bin/sh
# XVI DNA launcher (Mac / Linux): serves the XVI DNA holo desk on localhost so live charts and futures load.
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then exec python3 serve.py "$@"; fi
if command -v python >/dev/null 2>&1; then exec python serve.py "$@"; fi
echo "Python 3 is needed. Install it from https://www.python.org/downloads/ and run this again."
