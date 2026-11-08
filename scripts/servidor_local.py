"""Servidor local para desarrollo: python scripts/servidor_local.py (puerto 8000). Next lo usa vía rewrite."""
import os
import sys
from http.server import HTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "api"))
from analizar import handler  # noqa: E402

if __name__ == "__main__":
    print("API local en http://127.0.0.1:8000/api/analizar")
    HTTPServer(("127.0.0.1", 8000), handler).serve_forever()
