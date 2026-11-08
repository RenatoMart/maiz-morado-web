'use client';
/* eslint-disable max-len, react-hooks/set-state-in-effect */

import { createTimeline } from 'animejs';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
	EJE_FLECHA,
	FLECHA_DER,
	FLECHA_IZQ,
	LETRAS_UPN,
	LINEAS_SUB,
} from './logoDatos';

/*
 * Secuencia (unos 5 s, solo la primera vez de cada sesión):
 *  1. Una flecha única sube desde abajo, al centro.
 *  2. Una línea la corta por la mitad.
 *  3. Cada mitad da una vuelta circular hacia su lado (izquierda y derecha) y cae en su sitio del logo.
 *  4. Se juntan otra vez en una sola flecha, rebotan y abren el hueco.
 *  5. La flecha se corre a la izquierda y aparecen UPN y el nombre de la universidad.
 * Todo se dibuja a partir de un objeto de estado que anime.js interpola; `pintar` lo vuelca al SVG.
 */

const MITAD_HUECO = 17.5; // cada mitad se separa del eje esta distancia en el logo final
const CENTRO = 555; // centro horizontal del logo completo
const DESPLAZ = CENTRO - EJE_FLECHA; // lo que se corre la flecha sola hasta quedar al centro
const RADIO = 215; // radio de la vuelta de cada mitad
const CENTRO_IZQ = { x: 158, y: 350 };
const CENTRO_DER = { x: 401, y: 350 };
type Punto = [number, number];
const leer = (p: string): Punto[] =>
	p.split(' ').map(t => t.split(',').map(Number) as Punto);
/** Añade puntos intermedios a cada lado para que la mitad pueda curvarse sin quebrarse. */
const densificar = (pts: Punto[], paso = 24): Punto[] => {
	const out: Punto[] = [];
	pts.forEach((a, i) => {
		const b = pts[(i + 1) % pts.length];
		const n = Math.max(
			1,
			Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso),
		);
		for (let j = 0; j < n; j++)
			out.push([
				a[0] + ((b[0] - a[0]) * j) / n,
				a[1] + ((b[1] - a[1]) * j) / n,
			]);
	});
	return out;
};
const MALLA_IZQ = densificar(leer(FLECHA_IZQ));
const MALLA_DER = densificar(leer(FLECHA_DER));
const RADIO_CURVA = 380; // curvatura máxima: la mitad se dobla como un arco de este radio
/** Dobla la mitad alrededor de un eje vertical: `lado` -1 la curva hacia la izquierda, +1 hacia la derecha. */
const doblar = (
	malla: Punto[],
	c: { x: number; y: number },
	curva: number,
	lado: -1 | 1,
) => {
	if (curva < 0.003) return malla.map(([x, y]) => `${x},${y}`).join(' ');
	const rb = RADIO_CURVA / curva;
	return malla
		.map(([x, y]) => {
			const u = x - c.x;
			const phi = (y - c.y) / rb;
			const rho = rb - lado * u;
			const nx = c.x + lado * (rb - rho * Math.cos(phi));
			const ny = c.y + rho * Math.sin(phi);
			return `${nx.toFixed(1)},${ny.toFixed(1)}`;
		})
		.join(' ');
};
const SUB = LINEAS_SUB.flatMap((l, linea) => l.map(d => ({ d, linea })));
const BANDAS = [
	{ y: 366, h: 92 },
	{ y: 464, h: 92 },
	{ y: 562, h: 96 },
];

type Estado = {
	entra: number;
	corte: number;
	corteOculta: number;
	orbita: number;
	curva: number;
	hueco: number;
	pulso: number;
	carga: number;
	flash: number;
	onda: number;
	sacudida: number;
	retroceso: number;
	desplaza: number;
	texto: number;
};
const INICIO: Estado = {
	entra: 0,
	corte: 0,
	corteOculta: 0,
	orbita: 0,
	curva: 0,
	hueco: 0,
	pulso: 0,
	carga: 0,
	flash: 0,
	onda: 0,
	sacudida: 0,
	retroceso: 0,
	desplaza: 0,
	texto: 0,
};
const FINAL: Estado = {
	entra: 1,
	corte: 1,
	corteOculta: 1,
	orbita: 0,
	curva: 0,
	hueco: 1,
	pulso: 0,
	carga: 0,
	flash: 0,
	onda: 0,
	sacudida: 0,
	retroceso: 0,
	desplaza: 1,
	texto: 1,
};

const acotar = (v: number) => Math.min(1, Math.max(0, v));
const salidaExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const TEXTO_MS = 1500;
const PAUSA_MS = 5000; // el logo completo se queda a la vista este tiempo

export default function LogoAnimado() {
	const svg = useRef<SVGSVGElement>(null);
	const [listo, setListo] = useState(false);
	const [hecho, setHecho] = useState(false);
	const saltar = useRef<() => void>(() => {});

	useEffect(() => {
		const raiz = svg.current;
		if (!raiz) return;
		const q = <T extends Element>(s: string) => raiz.querySelector<T>(s)!;
		const todos = (s: string) =>
			Array.from(raiz.querySelectorAll<SVGElement>(s));
		const izq = q<SVGGElement>('[data-r="izq"]');
		const der = q<SVGGElement>('[data-r="der"]');
		const entrada = q<SVGGElement>('[data-r="entrada"]');
		const recorte = q<SVGRectElement>('#recorte-flecha rect');
		const corte = q<SVGRectElement>('[data-r="corte"]');
		const grieta = q<SVGRectElement>('[data-r="grieta"]');
		const punta = q<SVGCircleElement>('[data-r="punta"]');
		const onda = q<SVGCircleElement>('[data-r="onda"]');
		const destello = q<SVGRectElement>('[data-r="destello"]');
		const letras = todos('[data-l="upn"]');
		const subs = todos('[data-l="sub"]');

		const s: Estado = { ...INICIO };

		const pintar = () => {
			const dx = DESPLAZ * (1 - s.desplaza);
			const base = MITAD_HUECO * (1 - s.hueco);
			const a = 2 * Math.PI * s.orbita;
			const ox = RADIO * (1 - Math.cos(a));
			const oy = -RADIO * Math.sin(a);
			const sx = 1 + 0.09 * s.pulso;
			const sy = 1 - 0.06 * s.pulso;
			const rt = 70 * s.retroceso;
			const mover = (
				c: { x: number; y: number },
				x: number,
				y: number,
				giro: number,
			) =>
				`translate(${dx + x} ${y}) translate(${c.x} ${c.y}) rotate(${giro}) scale(${sx} ${sy}) translate(${-c.x} ${-c.y})`;
			izq.setAttribute('points', doblar(MALLA_IZQ, CENTRO_IZQ, s.curva, -1));
			der.setAttribute('points', doblar(MALLA_DER, CENTRO_DER, s.curva, 1));
			izq.setAttribute(
				'transform',
				mover(
					CENTRO_IZQ,
					base - ox - rt,
					oy,
					-360 * s.orbita - 16 * s.retroceso,
				),
			);
			der.setAttribute(
				'transform',
				mover(
					CENTRO_DER,
					-base + ox + rt,
					oy,
					360 * s.orbita + 16 * s.retroceso,
				),
			);
			const cx = EJE_FLECHA + dx;
			const tiembla = (Math.random() - 0.5) * 3.2 * s.carga;
			const golpe = (Math.random() - 0.5) * 16 * s.sacudida;
			const cs = 1 + 0.035 * s.carga;
			const cy2 = 1 - 0.06 * s.carga;
			entrada.setAttribute(
				'transform',
				`translate(${tiembla + golpe} ${70 * (1 - s.entra) + golpe * 0.6}) translate(${cx} 640) scale(${cs} ${cy2}) translate(${-cx} -640)`,
			);
			if (s.entra < 1) {
				recorte.setAttribute('y', String(60 + 600 * (1 - s.entra)));
				recorte.setAttribute('height', '800');
			} else {
				recorte.setAttribute('y', '-3000');
				recorte.setAttribute('height', '7000');
			}
			corte.setAttribute('x', String(EJE_FLECHA + dx - 2.5));
			corte.setAttribute('height', String(620 * s.corte));
			corte.setAttribute('opacity', String(1 - s.corteOculta));
			corte.setAttribute('width', String(3 + 7 * (1 - s.corteOculta)));
			grieta.setAttribute('x', String(cx - 0.9));
			grieta.setAttribute('opacity', String(0.75 * s.carga * (1 - s.corte)));
			punta.setAttribute('cx', String(cx));
			punta.setAttribute('cy', String(40 + 620 * s.corte));
			punta.setAttribute('opacity', String(s.corte > 0 && s.corte < 1 ? 1 : 0));
			onda.setAttribute('cx', String(cx));
			onda.setAttribute('r', String(30 + 560 * s.onda));
			onda.setAttribute(
				'opacity',
				String(s.onda > 0 ? 0.85 * (1 - s.onda) : 0),
			);
			onda.setAttribute('stroke-width', String(2 + 12 * (1 - s.onda)));
			destello.setAttribute('opacity', String(0.4 * s.flash));
			const t = s.texto * TEXTO_MS;
			letras.forEach((el, i) => {
				const p = salidaExpo(acotar((t - i * 90) / 750));
				el.setAttribute('transform', `translate(0 ${300 * (1 - p)})`);
				el.setAttribute('opacity', p > 0 ? '1' : '0');
			});
			subs.forEach((el, i) => {
				const p = salidaExpo(acotar((t - 520 - i * 20) / 520));
				el.setAttribute('transform', `translate(0 ${100 * (1 - p)})`);
				el.setAttribute('opacity', p > 0 ? '1' : '0');
			});
		};

		const terminar = () => {
			setHecho(true);
			try {
				sessionStorage.setItem('upn-intro', '1');
			} catch {}
		};

		const sinMovimiento = matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		let visto = false;
		try {
			visto = sessionStorage.getItem('upn-intro') === '1';
		} catch {}

		if (sinMovimiento) {
			Object.assign(s, FINAL);
			pintar();
			setListo(true);
			setHecho(true);
			return;
		}

		// Ciclo que se repite: corte, vuelta de las mitades, texto, pausa de 5 s, y todo vuelve a la flecha única.
		const REPOSO = { ...INICIO, entra: 1 };
		const T_TEXTO = 3450; // instante en que empieza a aparecer el texto
		const T_FIN_TEXTO = T_TEXTO + TEXTO_MS;
		const T_SALIDA = T_FIN_TEXTO + PAUSA_MS;
		const ciclo = createTimeline({ autoplay: false, onUpdate: pintar });
		ciclo
			// 1. tensión: la flecha se comprime, tiembla y aparece una grieta de luz en el eje
			.add(s, { carga: 1, duration: 520, ease: 'inQuad' }, 0)
			// 2. el tajo cae de arriba abajo, acelerando
			.add(s, { corte: 1, duration: 170, ease: 'inQuad' }, 520)
			// 3. impacto: destello, onda, golpe de pantalla y las mitades salen despedidas
			.add(s, { carga: 0, duration: 140, ease: 'outQuad' }, 690)
			.add(s, { flash: 1, duration: 50, ease: 'outQuad' }, 690)
			.add(s, { flash: 0, duration: 380, ease: 'outQuad' }, 740)
			.add(s, { onda: 1, duration: 850, ease: 'outExpo' }, 690)
			.add(s, { sacudida: 1, duration: 40, ease: 'linear' }, 690)
			.add(s, { sacudida: 0, duration: 380, ease: 'outQuad' }, 730)
			.add(s, { corteOculta: 1, duration: 260, ease: 'inQuad' }, 760)
			.add(s, { retroceso: 1, duration: 230, ease: 'outExpo' }, 700)
			.add(s, { retroceso: 0, duration: 800, ease: 'inOutCubic' }, 930)
			.add(s, { orbita: 1, hueco: 1, duration: 1250, ease: 'inOutCubic' }, 820)
			.add(s, { curva: 1, duration: 560, ease: 'outSine' }, 820)
			.add(s, { curva: 0, duration: 640, ease: 'inOutSine' }, 1450)
			// 4. se buscan, chocan (aplastan y rebotan) y se vuelven a abrir
			.add(s, { hueco: 0, duration: 260, ease: 'inQuad' }, 2250)
			.add(s, { pulso: 1, duration: 90, ease: 'outQuad' }, 2510)
			.add(s, { onda: 0, duration: 1 }, 2500)
			.add(s, { onda: 1, duration: 700, ease: 'outExpo' }, 2501)
			.add(s, { sacudida: 0.45, duration: 40, ease: 'linear' }, 2510)
			.add(s, { sacudida: 0, duration: 300, ease: 'outQuad' }, 2550)
			.add(s, { pulso: 0, duration: 420, ease: 'outBack(3)' }, 2600)
			.add(s, { hueco: 1, duration: 600, ease: 'outBack(2.6)' }, 2560)
			.add(s, { desplaza: 1, duration: 950, ease: 'inOutCubic' }, 3200)
			.add(s, { texto: 1, duration: TEXTO_MS, ease: 'linear' }, T_TEXTO)
			.call(terminar, T_FIN_TEXTO)
			// salida: se esconden las letras, la flecha vuelve al centro y las mitades se juntan
			.add(s, { texto: 0, duration: 950, ease: 'inQuad' }, T_SALIDA)
			.add(
				s,
				{ desplaza: 0, duration: 900, ease: 'inOutCubic' },
				T_SALIDA + 800,
			)
			.add(s, { hueco: 0, duration: 450, ease: 'inOutCubic' }, T_SALIDA + 1550)
			.add(s, { pulso: 1, duration: 110, ease: 'outQuad' }, T_SALIDA + 1950)
			.add(s, { pulso: 0, duration: 300, ease: 'outBack' }, T_SALIDA + 2060)
			.call(() => {
				// vuelve a empezar desde la flecha única
				setTimeout(() => {
					Object.assign(s, REPOSO);
					pintar();
					ciclo.restart();
				}, 350);
			}, T_SALIDA + 2400);

		const empezarCiclo = () => {
			Object.assign(s, REPOSO);
			pintar();
			ciclo.restart();
		};

		pintar();
		setListo(true);
		let intro: ReturnType<typeof createTimeline> | null = null;
		if (visto) {
			setHecho(true);
			s.entra = 1;
			pintar();
			empezarCiclo();
		} else {
			intro = createTimeline({ onUpdate: pintar, onComplete: empezarCiclo });
			intro.add(s, { entra: 1, duration: 950, ease: 'outExpo' }, 350);
			// la flecha única se queda un instante antes del corte
			intro.add(s, { corte: 0, duration: 450 }, 1300);
		}

		saltar.current = () => {
			intro?.pause();
			Object.assign(s, REPOSO);
			pintar();
			ciclo.restart();
			ciclo.seek(T_FIN_TEXTO + 10);
			ciclo.play();
			terminar();
		};
		return () => {
			intro?.pause();
			ciclo.pause();
		};
	}, []);

	useEffect(() => {
		const tecla = (e: KeyboardEvent) => {
			if (!hecho && (e.key === 'Escape' || e.key === ' ')) saltar.current();
		};
		addEventListener('keydown', tecla);
		return () => removeEventListener('keydown', tecla);
	}, [hecho]);

	return (
		<main
			className='fondo-upn relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4'
			onClick={() => !hecho && saltar.current()}
		>
			<svg
				aria-label='Universidad Privada del Norte'
				className='max-h-[62dvh] w-[min(90vw,860px)] overflow-visible'
				ref={svg}
				role='img'
				style={{ visibility: listo ? 'visible' : 'hidden' }}
				viewBox='0 0 1110 720'
			>
				<defs>
					<clipPath id='recorte-flecha'>
						<rect height='800' width='2600' x='-700' y='660' />
					</clipPath>
					{BANDAS.map((b, i) => (
						<clipPath id={`banda-${i}`} key={i}>
							<rect height={b.h} width='520' x='560' y={b.y} />
						</clipPath>
					))}
					<clipPath id='banda-upn'>
						<rect height='290' width='520' x='560' y='36' />
					</clipPath>
				</defs>
				<g clipPath='url(#recorte-flecha)'>
					<g data-r='entrada'>
						<g fill='#0F0F0F'>
							<polygon data-r='izq' points={FLECHA_IZQ} />
							<polygon data-r='der' points={FLECHA_DER} />
						</g>
					</g>
				</g>
				<rect
					data-r='destello'
					fill='#FFFBE8'
					height='6000'
					opacity='0'
					width='6000'
					x='-2500'
					y='-2500'
				/>
				<circle
					cy='350'
					data-r='onda'
					fill='none'
					opacity='0'
					r='30'
					stroke='#FFFBE8'
				/>
				<rect
					data-r='grieta'
					fill='#FFFBE8'
					height='620'
					opacity='0'
					width='1.8'
					x={EJE_FLECHA}
					y='40'
				/>
				<circle
					data-r='punta'
					fill='#FFFFFF'
					opacity='0'
					r='13'
					style={{ filter: 'drop-shadow(0 0 10px #fff)' }}
				/>
				<rect
					data-r='corte'
					fill='#FFF8DC'
					height='0'
					style={{ filter: 'drop-shadow(0 0 6px rgba(255,248,220,.9))' }}
					width='5'
					x={EJE_FLECHA}
					y='40'
				/>
				<g clipPath='url(#banda-upn)'>
					<g
						fill='#0F0F0F'
						stroke='#0F0F0F'
						strokeLinejoin='round'
						strokeWidth='8'
					>
						{LETRAS_UPN.map((d, i) => (
							<path d={d} data-l='upn' key={i} />
						))}
					</g>
				</g>
				{BANDAS.map((_, linea) => (
					<g clipPath={`url(#banda-${linea})`} fill='#0F0F0F' key={linea}>
						{SUB.filter(l => l.linea === linea).map((l, i) => (
							<path d={l.d} data-l='sub' key={i} />
						))}
					</g>
				))}
			</svg>

			<div
				aria-hidden={!hecho}
				className={`mt-6 flex flex-col items-center gap-4 transition-opacity duration-700 ${
					hecho ? 'opacity-100' : 'pointer-events-none opacity-0'
				}`}
			>
				<Link
					className='boton-iniciar'
					href='/analizar'
					tabIndex={hecho ? 0 : -1}
				>
					Iniciar
					<svg
						aria-hidden='true'
						className='size-5'
						fill='none'
						stroke='currentColor'
						strokeLinecap='square'
						strokeWidth='3'
						viewBox='0 0 24 24'
					>
						<path d='M4 12h15M13 5l7 7-7 7' />
					</svg>
				</Link>
				<p className='text-sm font-medium tracking-wide text-black/60'>
					Inspección de calidad del maíz morado · Ingeniería Industrial
				</p>
			</div>
		</main>
	);
}
