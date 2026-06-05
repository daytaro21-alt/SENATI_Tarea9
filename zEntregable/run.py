#!/usr/bin/env python3
"""
Startup script — runs uvicorn and opens the browser automatically.
Usage: python run.py
"""
import os
import sys
import subprocess
import threading
import time
import webbrowser

URL = "http://127.0.0.1:8000"
BANNER = """
==============================================================
   CLASIFICADOR DE TRAMITES MUNICIPALES
   Municipalidad Provincial de Yau
==============================================================
   URL : http://127.0.0.1:8000
   Detener : Ctrl+C
==============================================================
"""


def _open_browser():
    time.sleep(2.0)
    webbrowser.open(URL)


if __name__ == "__main__":
    print(BANNER)
    threading.Thread(target=_open_browser, daemon=True).start()
    subprocess.run(
        [
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--reload",
            "--host", "127.0.0.1",
            "--port", "8000",
        ],
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
