const LADO_MAXIMO = 1280;
const TAMANO_MAXIMO = 3.6 * 1024 * 1024;

function aBlob(canvas: HTMLCanvasElement, calidad: number) {
	return new Promise<Blob>((ok, error) =>
		canvas.toBlob(
			b => (b ? ok(b) : error(new Error('No se pudo preparar la imagen.'))),
			'image/jpeg',
			calidad,
		),
	);
}

/** Reduce la foto en el navegador para que quepa en la petición y respeta la orientación del teléfono. */
export async function prepararImagen(archivo: File): Promise<Blob> {
	if (!archivo.type.startsWith('image/')) {
		throw new Error('Elige un archivo de imagen (JPG o PNG).');
	}
	let mapa: ImageBitmap;
	try {
		mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
	} catch {
		throw new Error('No se pudo abrir la imagen. Prueba con otra foto.');
	}
	const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(mapa.width * escala);
	canvas.height = Math.round(mapa.height * escala);
	canvas.getContext('2d')?.drawImage(mapa, 0, 0, canvas.width, canvas.height);
	mapa.close();
	let calidad = 0.9;
	let blob = await aBlob(canvas, calidad);
	while (blob.size > TAMANO_MAXIMO && calidad > 0.5) {
		calidad -= 0.1;
		blob = await aBlob(canvas, calidad);
	}
	return blob;
}
