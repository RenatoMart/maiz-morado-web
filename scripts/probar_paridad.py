"""Compara el veredicto de esta función con el del proyecto de entrenamiento sobre las fotos de prueba."""
import csv, json, sys, time
from pathlib import Path
import cv2
RAIZ = Path(__file__).resolve().parent.parent
ENT = Path(sys.argv[1])  # carpeta noche/ del proyecto de entrenamiento
sys.path.insert(0, str(RAIZ / "api"))
import _nucleo
meta = [m for m in json.load(open(ENT / "datos/meta.json")) if m["split"] == "test"]
ref = {f["foto"]: f for f in csv.DictReader(open(ENT / "pruebas_v4/resultados.csv"))}
iguales = difp = 0; t = []; filas = []
for m in meta:
    bgr = cv2.imread(str(ENT / "datos/images/test" / f"{m['id']}.jpg"))
    t0 = time.time(); r = _nucleo.analizar(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)); t.append(time.time() - t0)
    json.dumps(r)  # debe poder convertirse a JSON, como hace la función real
    o = ref[m["n"]]; mismo = (r["categoria"] == o["categoria"]); iguales += mismo; difp = max(difp, abs(r["p_descarte"] - float(o["p_descarte"])))
    filas.append((m["n"], m["ref"], r["categoria"], o["categoria"], r["p_descarte"], float(o["p_descarte"])))
ok = lambda c, real: (c == "Descarte") == (real == "descarte")
print(f"fotos {len(meta)} | misma categoría que el proyecto de entrenamiento: {iguales}/{len(meta)} | diferencia máxima de probabilidad {difp:.3f}")
print(f"web: Primera {sum(ok(f[2], f[1]) for f in filas if f[1]=='primera')}/{sum(f[1]=='primera' for f in filas)} | Descarte {sum(ok(f[2], f[1]) for f in filas if f[1]=='descarte')}/{sum(f[1]=='descarte' for f in filas)}")
print("distintas:", [(f[0].replace('primera_clase__','P ').replace('descarte__','D '), f[2], f[3], f[4], f[5]) for f in filas if f[2] != f[3]])
t.sort(); print(f"tiempo por foto: mediana {t[len(t)//2]:.2f} s | máximo {t[-1]:.2f} s")
