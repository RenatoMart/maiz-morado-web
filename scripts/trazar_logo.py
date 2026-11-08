"""Vectoriza el logo de la UPN (captura en PNG) y escribe src/components/logoDatos.ts.
Las flechas se reconstruyen como polígonos simétricos; el texto se traza sobre una versión ampliada y suavizada.
Uso: .venvapi/bin/python scripts/trazar_logo.py RUTA/logo.png"""
import sys
from pathlib import Path

import cv2
import numpy as np

SRC = cv2.imread(sys.argv[1])
G = cv2.cvtColor(SRC, cv2.COLOR_BGR2GRAY)
X0, Y0, K = 75, 240, 6          # origen de la caja de diseño (px de la captura) y escala a unidades de diseño
UP = 12                          # ampliación para trazar


def trazar(x0, y0, x1, y1, eps=1.6, sigma=7):
    c = cv2.resize(G[y0:y1, x0:x1], None, fx=UP, fy=UP, interpolation=cv2.INTER_CUBIC)
    c = cv2.GaussianBlur(c, (0, 0), sigma)
    t, b = cv2.threshold(c, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    cont, jer = cv2.findContours(b, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    f = K / UP
    res = []
    for i, ct in enumerate(cont):
        if jer[0][i][3] != -1 or cv2.contourArea(ct) < 40 * UP * UP / 16:
            continue
        hijos = [j for j, h in enumerate(jer[0]) if h[3] == i]
        d = ""
        for cc in [ct] + [cont[j] for j in hijos]:
            ap = cv2.approxPolyDP(cc, eps, True)[:, 0, :].astype(float)
            ap[:, 0] = (x0 - X0) * K + ap[:, 0] * f
            ap[:, 1] = (y0 - Y0) * K + ap[:, 1] * f
            d += "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in ap) + "Z "
        x, y, w, h = cv2.boundingRect(ct)
        res.append((x, y, w, h, d.strip()))
    return sorted(res)


# flecha: contorno de cada mitad a partir de la imagen, simplificado a pocos vértices y hecho simétrico
c = cv2.resize(G[240:360, 75:260], None, fx=6, fy=6, interpolation=cv2.INTER_CUBIC)
c = cv2.GaussianBlur(c, (0, 0), 2)
_, b = cv2.threshold(c, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
b[:, 560:] = 0
cont, _ = cv2.findContours(b, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
cont = sorted(cont, key=cv2.contourArea, reverse=True)
mitades = sorted(cont[:2], key=lambda q: q[:, 0, 0].min())
L = cv2.approxPolyDP(mitades[0], 6, True)[:, 0, :].astype(float)

upn = trazar(168, 246, 256, 296, eps=3.2, sigma=12)
sub = trazar(168, 299, 256, 350, eps=2.6, sigma=9)
print("UPN letras:", len(upn), "subtítulo glifos:", len(sub))

# ---- texto con la tipografía Bebas Neue (contornos exactos), ajustado a las cajas del logo ----
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FUENTE = TTFont("node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff")
GS, CMAP, HM = FUENTE.getGlyphSet(), FUENTE.getBestCmap(), FUENTE["hmtx"]


def glifo_en_caja(ch, x0, y0, x1, y1):
    """Contorno del glifo `ch` estirado para llenar exactamente la caja (x0,y0)-(x1,y1)."""
    n = CMAP[ord(ch)]
    bp = BoundsPen(GS)
    GS[n].draw(bp)
    gx0, gy0, gx1, gy1 = bp.bounds
    sx, sy = (x1 - x0) / (gx1 - gx0), (y1 - y0) / (gy1 - gy0)
    pen = SVGPathPen(GS, ntos=lambda v: f"{v:.1f}")
    GS[n].draw(TransformPen(pen, (sx, 0, 0, -sy, x0 - gx0 * sx, y1 + gy0 * sy)))
    return pen.getCommands()


def linea(texto, x0, x1, ytop, ybase, espacio=0.0):
    """Reparte las letras de `texto` entre x0 y x1 según los avances de la fuente; devuelve un contorno por letra."""
    avances = []
    for ch in texto:
        avances.append(HM[CMAP[ord(ch)]][0] if ch != " " else HM[CMAP[ord("I")]][0] * 0.9)
    total = sum(avances)
    esc = (x1 - x0) / total
    out, x = [], x0
    for ch, a in zip(texto, avances):
        if ch != " ":
            n = CMAP[ord(ch)]
            bp = BoundsPen(GS)
            GS[n].draw(bp)
            gx0, gy0, gx1, gy1 = bp.bounds
            l, r = x + gx0 * esc, x + gx1 * esc
            out.append(glifo_en_caja(ch, l + espacio, ytop if gy1 > 600 else ytop, r - espacio, ybase))
        x += a * esc
    return out


# cajas medidas en la captura (unidades de diseño)
CAJAS_UPN = [(upn[k][0] / 2 + (168 - X0) * K * 0, 0) for k in range(3)]  # (solo para depurar)
LETRAS = []
for ch, (x, y, w, h, _) in zip("UPN", upn):
    X = (168 - X0) * K + x / 2
    Y = (246 - Y0) * K + y / 2
    LETRAS.append(glifo_en_caja(ch, X + 4, Y + 4, X + w / 2 - 4, Y + h / 2 - 4))
SUB = [linea("UNIVERSIDAD", 590, 1036, 380, 440, 1.2), linea("PRIVADA", 592, 868, 478, 538, 1.2), linea("DEL NORTE", 592, 933, 575, 637, 1.2)]

ARROW_L = [(207, 60), (262, 60), (262, 640), (180, 640), (180, 218), (55, 305), (55, 213), (142, 139)]
EJE = 559  # x del eje de simetría: la mitad derecha es el espejo de la izquierda
ARROW_R = [(EJE - x, y) for x, y in ARROW_L][::-1]
pts = lambda p: " ".join(f"{x},{y}" for x, y in p)
js = lambda L: "[" + ", ".join("'" + d + "'" for d in L) + "]"
ts = ["// Generado por scripts/trazar_logo.py a partir del logo de la UPN. No editar a mano.",
      "// Unidades de diseño: 6 × los píxeles de la captura. Caja del logo: 1110 × 720.",
      f"export const FLECHA_IZQ = '{pts(ARROW_L)}';",
      f"export const FLECHA_DER = '{pts(ARROW_R)}';",
      f"export const EJE_FLECHA = {EJE / 2};",
      "export const LETRAS_UPN = " + js(LETRAS) + ";",
      "export const LINEAS_SUB: string[][] = [" + ", ".join(js(l) for l in SUB) + "];"]
Path("src/components/logoDatos.ts").write_text("\n".join(ts) + "\n")
print("escrito", sum(len(t) for t in ts), "bytes")
