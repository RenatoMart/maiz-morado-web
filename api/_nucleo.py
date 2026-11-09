"""Núcleo del análisis: detección con ONNX, medidas por proporciones y decisión.

Replica a maiz_morado/medidas.py y veredicto.py del proyecto de entrenamiento. Solo usa numpy y OpenCV: el modelo ONNX se
ejecuta con cv2.dnn, así que no hace falta ONNX Runtime y el paquete queda mucho más liviano.
"""
import json
import math
import os

import cv2
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RUTA = os.path.join(AQUI, "_modelo")
CLASES = ("granos quebrados o deteriorados", "perdida extensa de granos", "pigmentacion roja", "pudricion", "zona sin granos")
ORDEN = ["n_cajas", "n0", "n1", "n2", "n3", "n4", "area_total", "a0", "a1", "a2", "a3", "a4", "a_med", "rojo15", "rojo25"]
NOMBRES = {"n_cajas": "cantidad de zonas marcadas", "area_total": "proporción de la mazorca con defectos", "a_med": "rojez general de la mazorca", "rojo15": "granos rojizos", "rojo25": "granos muy rojos",
           "a0": "área de granos quebrados", "a1": "área de pérdida extensa", "a2": "área de pigmentación roja", "a3": "área de pudrición", "a4": "área sin granos",
           "n0": "granos quebrados", "n1": "pérdida extensa", "n2": "zonas rojas", "n3": "zonas de pudrición", "n4": "zonas sin granos"}
LADO_MEDIDAS = 800
MAX_DET = 100

_sesion = None
_decision = None


def red():
    global _sesion
    if _sesion is None:
        _sesion = cv2.dnn.readNetFromONNX(os.path.join(RUTA, "best.onnx"))
    return _sesion


def decision():
    global _decision
    if _decision is None:
        d = json.load(open(os.path.join(RUTA, "decision.json")))
        if d["orden_rasgos"] != ORDEN:
            raise RuntimeError("El orden de las medidas no coincide con el entrenamiento")
        _decision = d
    return _decision


def _letterbox(rgb, lado=640):
    h, w = rgb.shape[:2]
    r = min(lado / h, lado / w)
    nh, nw = round(h * r), round(w * r)
    im = cv2.resize(rgb, (nw, nh), interpolation=cv2.INTER_LINEAR) if (nh, nw) != (h, w) else rgb
    top, left = round((lado - nh) / 2 - 0.1), round((lado - nw) / 2 - 0.1)
    lienzo = np.full((lado, lado, 3), 114, np.uint8)
    lienzo[top:top + nh, left:left + nw] = im
    return lienzo, r, left, top


def _nms(cajas, puntajes, iou):
    idx = cv2.dnn.NMSBoxes([[float(c[0]), float(c[1]), float(c[2]), float(c[3])] for c in cajas], [float(p) for p in puntajes], 0.0, float(iou))
    return list(np.array(idx).flatten()) if len(idx) else []


def detectar(rgb, conf_min, iou):
    """Devuelve [(clase, xc, yc, ancho, alto, confianza)] con coordenadas normalizadas 0-1."""
    h0, w0 = rgb.shape[:2]
    lienzo, r, dx, dy = _letterbox(rgb)
    x = np.ascontiguousarray(lienzo.transpose(2, 0, 1)[None].astype(np.float32) / 255.0)
    n = red()
    n.setInput(x)
    sal = n.forward()[0].T  # 8400 x (4 + clases)
    puntajes = sal[:, 4:]
    cls = puntajes.argmax(1)
    conf = puntajes.max(1)
    ok = conf >= conf_min
    if not ok.any():
        return []
    b, conf, cls = sal[ok, :4], conf[ok], cls[ok]
    xyxy = np.stack([b[:, 0] - b[:, 2] / 2, b[:, 1] - b[:, 3] / 2, b[:, 2], b[:, 3]], 1)  # x, y, w, h para NMS
    out = []
    for c in np.unique(cls):
        m = np.where(cls == c)[0]
        for k in _nms(xyxy[m], conf[m], iou):
            j = m[k]
            cx, cy, bw, bh = b[j]
            x1, y1, x2, y2 = (cx - bw / 2 - dx) / r, (cy - bh / 2 - dy) / r, (cx + bw / 2 - dx) / r, (cy + bh / 2 - dy) / r
            x1, y1, x2, y2 = max(0.0, x1), max(0.0, y1), min(float(w0), x2), min(float(h0), y2)
            if x2 - x1 < 1 or y2 - y1 < 1:
                continue
            out.append((int(c), (x1 + x2) / 2 / w0, (y1 + y2) / 2 / h0, (x2 - x1) / w0, (y2 - y1) / h0, float(conf[j])))
    out.sort(key=lambda d: -d[5])
    return out[:MAX_DET]


def reducir(rgb, lado=LADO_MEDIDAS):
    h, w = rgb.shape[:2]
    e = lado / max(h, w)
    return cv2.resize(rgb, (round(w * e), round(h * e)), interpolation=cv2.INTER_AREA) if e < 1 else rgb


def _lab(rgb):
    x = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    return x[..., 0] * 100 / 255, x[..., 1] - 128


def mascara_mazorca(rgb):
    h, w = rgb.shape[:2]
    m = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    L, _ = _lab(rgb)
    m[L < np.percentile(L, 35)] = cv2.GC_PR_FGD
    k = max(4, int(0.02 * min(h, w)))
    m[:k] = m[-k:] = cv2.GC_BGD
    m[:, :k] = m[:, -k:] = cv2.GC_BGD
    bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    try:
        cv2.setNumThreads(1)
        cv2.grabCut(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), m, None, bg, fg, 5, cv2.GC_INIT_WITH_MASK)
        f = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(np.uint8)
    except cv2.error:
        f = (L < np.percentile(L, 35)).astype(np.uint8)
    f = cv2.morphologyEx(f, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    f = cv2.morphologyEx(f, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n, et, st, _ = cv2.connectedComponentsWithStats(f)
    if n > 1:
        f = (et == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    if f.mean() < 0.01:
        f = (L < np.percentile(L, 35)).astype(np.uint8)
    return f


def _union(cajas, h, w, clase=None):
    u = np.zeros((h, w), np.uint8)
    for c, xc, yc, bw, bh, *_ in cajas:
        if clase is None or int(c) == clase:
            u[int(max(0, (yc - bh / 2) * h)):int(min(h, (yc + bh / 2) * h)) + 1, int(max(0, (xc - bw / 2) * w)):int(min(w, (xc + bw / 2) * w)) + 1] = 1
    return u


def rasgos(rgb, mascara, cajas):
    h, w = mascara.shape
    cob = max(int(mascara.sum()), 1)
    r = {"n_cajas": float(len(cajas)), "area_total": float((_union(cajas, h, w) & mascara).sum() / cob)}
    for i in range(len(CLASES)):
        r[f"n{i}"] = float(sum(1 for c in cajas if int(c[0]) == i))
        r[f"a{i}"] = float((_union(cajas, h, w, i) & mascara).sum() / cob)
    L, A = _lab(rgb)
    v = (mascara == 1) & (L > 8) & (L < 70)
    r["a_med"] = float(np.median(A[v])) if v.any() else 0.0
    r["rojo15"] = float((A[v] > 15).mean()) if v.any() else 0.0
    r["rojo25"] = float((A[v] > 25).mean()) if v.any() else 0.0
    return r


def _valor(clave, v):
    if (clave.startswith("a") and clave != "a_med") or clave in ("area_total", "rojo15", "rojo25"):
        return f"{v * 100:.1f} %"
    return f"{v:.0f}" if clave.startswith("n") else f"{v:.1f}"


# ---- ¿hay una mazorca en la foto? ----
# El detector solo busca defectos: sin esta comprobación, una foto sin maíz "no tiene defectos" y saldría como primera.
# La mazorca de maíz morado es una mancha oscura, alargada y con textura (los granos). Los umbrales se calibraron con
# las 751 fotos del conjunto (todas se aceptan) y con recortes de fondo, capturas y fotos de otros objetos (casi todos se rechazan).
MENSAJE_SIN_MAZORCA = "No se reconoce una mazorca de maíz morado en la foto."


def hay_mazorca(rgb):
    """Devuelve (hay, medidas). rgb: imagen uint8 (alto, ancho, 3)."""
    h, w = rgb.shape[:2]
    e = 320 / max(h, w)
    im = cv2.resize(rgb, None, fx=e, fy=e, interpolation=cv2.INTER_AREA) if e < 1 else rgb
    im = cv2.GaussianBlur(im, (0, 0), 1.5)
    L = cv2.cvtColor(im, cv2.COLOR_RGB2LAB)[..., 0].astype(np.float32) * 100 / 255
    oscuro = (L < 42).astype(np.uint8)
    oscuro = cv2.morphologyEx(oscuro, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    oscuro = cv2.morphologyEx(oscuro, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, etiquetas, est, _ = cv2.connectedComponentsWithStats(oscuro)
    if n <= 1:
        return False, {"fraccion": 0.0}
    k = 1 + int(np.argmax(est[1:, cv2.CC_STAT_AREA]))
    comp = (etiquetas == k).astype(np.uint8)
    fraccion = float(comp.sum() / comp.size)
    contornos, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    (_, _), (rw, rh), _ = cv2.minAreaRect(max(contornos, key=cv2.contourArea))
    alargada = max(rw, rh) / max(1.0, min(rw, rh))
    relleno = float(comp.sum() / max(1.0, rw * rh))
    gris = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY).astype(np.float32)
    media = cv2.blur(gris, (5, 5))
    varianza = cv2.blur(gris * gris, (5, 5)) - media * media
    interior = cv2.erode(comp, np.ones((9, 9), np.uint8)) > 0
    textura = float(np.sqrt(np.maximum(varianza[interior], 0)).mean()) if interior.any() else 0.0
    borde = float((comp[0].sum() + comp[-1].sum() + comp[:, 0].sum() + comp[:, -1].sum()) / (2 * sum(comp.shape)))
    hay = 0.06 <= fraccion <= 0.90 and relleno >= 0.40 and textura >= 5.0 and alargada >= 1.05 and not (fraccion > 0.35 and borde > 0.25)
    return bool(hay), {"fraccion": fraccion, "alargada": alargada, "relleno": relleno, "textura": textura, "borde": borde}


def analizar(rgb):
    """rgb: imagen uint8 (alto, ancho, 3). Devuelve el resultado listo para enviar a la interfaz."""
    d = decision()
    chica = reducir(rgb)
    hay, _ = hay_mazorca(chica)
    if not hay:
        return {"mazorca_detectada": False, "mensaje": MENSAJE_SIN_MAZORCA}
    dets = [x for x in detectar(rgb, d["confianza_minima"], d.get("iou_nms", 0.7))]
    mascara = mascara_mazorca(chica)
    r = rasgos(chica, mascara, dets)
    z = (np.array([r[k] for k in ORDEN]) - np.array(d["media"])) / np.array(d["escala"])
    aportes = z * np.array(d["coef"])
    p = 1 / (1 + math.exp(-float(aportes.sum() + d["intercepto"])))
    if p >= d["umbral_descarte"]:
        cat = "Descarte"
    elif r["n4"] >= d["zonas_para_segunda"]:
        cat = "Segunda"
    else:
        cat = "Primera"
    motivos = []
    if cat == "Descarte":
        for i in np.argsort(-aportes):
            k = ORDEN[i]
            if aportes[i] <= 0.3 or r[k] <= 0 or len(motivos) >= 3 or k in ("area_total", "n_cajas"):
                continue
            if k in ("a_med", "rojo15", "rojo25"):
                t = "tono rojizo en la mazorca"
            else:
                t = f"{NOMBRES[k]}: {_valor(k, r[k])}"
            if t not in motivos:
                motivos.append(t)
    return {
        "mazorca_detectada": True, "categoria": cat, "pasa": cat != "Descarte", "p_descarte": round(float(p), 3), "umbral": float(d["umbral_descarte"]), "motivos": motivos,
        "area_defectos_pct": round(float(r["area_total"]) * 100, 1), "mazorca_pct_imagen": round(float(mascara.mean()) * 100, 1),
        "porcentaje_por_clase": {CLASES[i]: round(float(r[f"a{i}"]) * 100, 1) for i in range(len(CLASES))},
        "zonas": [{"clase": CLASES[int(c)], "confianza": round(float(q), 3), "x": round(float(xc - w / 2), 4), "y": round(float(yc - h / 2), 4), "ancho": round(float(w), 4), "alto": round(float(h), 4)} for c, xc, yc, w, h, q in dets],
    }
