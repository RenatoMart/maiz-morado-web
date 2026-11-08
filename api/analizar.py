"""Función de Vercel (Python): recibe una foto JPEG y devuelve el análisis. No guarda nada."""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _nucleo import analizar  # noqa: E402

LIMITE = 4 * 1024 * 1024  # Vercel rechaza cuerpos de más de unos 4.5 MB
LADO_MAX = 1600


class handler(BaseHTTPRequestHandler):
    def _responder(self, codigo, cuerpo):
        datos = json.dumps(cuerpo, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, "item") else str(o)).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(datos)))
        self.end_headers()
        self.wfile.write(datos)

    def do_GET(self):
        self._responder(200, {"estado": "ok"})

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if n <= 0:
                return self._responder(400, {"error": "No se recibió ninguna imagen."})
            if n > LIMITE:
                return self._responder(413, {"error": "La imagen es demasiado grande. Usa una foto de menos de 4 MB."})
            datos = self.rfile.read(n)
            bgr = cv2.imdecode(np.frombuffer(datos, np.uint8), cv2.IMREAD_COLOR)
            if bgr is None:
                return self._responder(400, {"error": "No se pudo leer la imagen. Usa una foto JPG o PNG."})
            h, w = bgr.shape[:2]
            if min(h, w) < 100:
                return self._responder(400, {"error": "La imagen es demasiado pequeña."})
            if max(h, w) > LADO_MAX:
                e = LADO_MAX / max(h, w)
                bgr = cv2.resize(bgr, (round(w * e), round(h * e)), interpolation=cv2.INTER_AREA)
            self._responder(200, analizar(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)))
        except Exception as e:  # el detalle se queda en los registros del servidor
            print("error de análisis:", repr(e), file=sys.stderr)
            self._responder(500, {"error": "No se pudo analizar la imagen. Intenta con otra foto."})
