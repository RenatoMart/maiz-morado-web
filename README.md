# Inspección de maíz morado (web)

Sistema web que recibe la foto de una mazorca, marca las zonas con defectos, calcula qué proporción de la mazorca
está afectada y dice si pasa (primera o segunda) o se descarta. Es un **apoyo a la inspección**: la decisión final
es de la persona.

- **Frontend:** Next.js (App Router) + Tailwind. Portada con el logo y el botón *Iniciar*, y la pantalla `/analizar`.
- **Análisis:** función en Python (`api/analizar.py`) que ejecuta el modelo YOLO exportado a ONNX con OpenCV (`cv2.dnn`),
  mide proporciones y decide. No usa PyTorch ni ONNX Runtime, y no guarda las fotos.
- **Modelo:** `api/_modelo/best.onnx` y `api/_modelo/decision.json`, de `noche/modelo_final_v4` del proyecto de entrenamiento.

## Desarrollo local

```bash
npm install
uv venv --python 3.12 .venvapi && uv pip install --python .venvapi/bin/python -r requirements.txt
.venvapi/bin/python scripts/servidor_local.py   # API en el puerto 8000
npm run dev                                     # web en http://localhost:3000 (redirige /api/analizar al 8000)
```

Comprobar que la función da el mismo veredicto que el proyecto de entrenamiento (80 fotos de prueba):

```bash
.venvapi/bin/python scripts/probar_paridad.py RUTA/AL/PROYECTO/noche
```

## Publicar en Vercel

1. Importa el repositorio en Vercel (preset Next.js). `vercel.json` ya configura la función de Python y sus archivos.
2. `.python-version` fija Python 3.12 y `requirements.txt` solo necesita `numpy` y `opencv-python-headless`.
3. El paquete de Python mide unos **203 MB** instalados (OpenCV pesa mucho); el límite de Vercel que encontré en la documentación es 250 MB (y 500 MB según otra página), así que el margen es poco. Después de publicar, prueba `/analizar` con una foto real. **No se pudo probar el despliegue en Vercel desde aquí:**
   revisa en el primer despliegue el tamaño del paquete, el tiempo de respuesta (unos 2 s por foto en una laptop) y la
   memoria de la función.

El `dockerfile` de la plantilla solo empaqueta Next.js; no incluye la función de Python.

## Pendientes

- Reemplazar `public/logo-upn.svg` (marcador de posición) por el logo oficial de la UPN y ajustar `src/components/Logo.tsx`.
- Los resultados del modelo son preliminares (ver el informe en el proyecto de entrenamiento): la categoría «Segunda» no se
  pudo validar con mazorcas reales y el fondo de la foto puede influir.
- Si se reentrena el modelo, copiar el nuevo `best.onnx` y `decision.json` a `api/_modelo/` y repetir `probar_paridad.py`.
