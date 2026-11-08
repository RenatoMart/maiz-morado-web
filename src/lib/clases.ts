export type Categoria = 'Primera' | 'Segunda' | 'Descarte';

export type Zona = {
	clase: string;
	confianza: number;
	x: number;
	y: number;
	ancho: number;
	alto: number;
};

export type ResultadoAnalisis = {
	categoria: Categoria;
	pasa: boolean;
	p_descarte: number;
	umbral: number;
	motivos: string[];
	area_defectos_pct: number;
	mazorca_pct_imagen: number;
	porcentaje_por_clase: Record<string, number>;
	zonas: Zona[];
};

export const CLASES: Record<
	string,
	{ nombre: string; significado: string; color: string }
> = {
	'zona sin granos': {
		nombre: 'Zona sin granos',
		significado: 'Hueco donde faltan uno o varios granos.',
		color: '#FFE600',
	},
	pudricion: {
		nombre: 'Pudrición',
		significado:
			'Tejido blando u oscuro, a veces con moho. Descarta la mazorca.',
		color: '#00E676',
	},
	'pigmentacion roja': {
		nombre: 'Pigmentación roja',
		significado: 'Granos rojos en lugar de morados.',
		color: '#FF2A2A',
	},
	'granos quebrados o deteriorados': {
		nombre: 'Granos quebrados o deteriorados',
		significado: 'Granos rotos o dañados, a menudo con tono blanquecino.',
		color: '#3A86FF',
	},
	'perdida extensa de granos': {
		nombre: 'Pérdida extensa de granos',
		significado: 'Zona grande sin granos, de un cuarto o más de la mazorca.',
		color: '#FF4FD8',
	},
};

export const VEREDICTO: Record<
	Categoria,
	{ titulo: string; detalle: string; tono: 'ok' | 'medio' | 'no' }
> = {
	Primera: {
		titulo: 'Pasa: primera calidad',
		detalle: 'No se encontraron defectos que superen lo tolerado.',
		tono: 'ok',
	},
	Segunda: {
		titulo: 'Pasa: segunda calidad',
		detalle: 'Tiene zonas sin granos, pero dentro de lo tolerado.',
		tono: 'medio',
	},
	Descarte: {
		titulo: 'Se descarta',
		detalle: 'Los defectos superan lo tolerado para vender la mazorca.',
		tono: 'no',
	},
};
