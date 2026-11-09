/* eslint-disable max-len */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RespuestaAnalisis as TipoResultado } from '../lib/clases';
import { prepararImagen } from '../lib/imagen';
import Camara from './Camara';
import FlechaUPN from './FlechaUPN';
import Resultado from './Resultado';
import SinMazorca from './SinMazorca';

type Estado =
	| { fase: 'inicio' }
	| { fase: 'preparando' | 'analizando'; vista: string }
	| { fase: 'listo'; vista: string; datos: TipoResultado }
	| { fase: 'error'; mensaje: string; vista?: string };

const TEXTO = {
	preparando: 'Preparando la foto…',
	analizando: 'Analizando la mazorca… puede tardar unos segundos.',
} as const;

export default function Analizador() {
	const [estado, setEstado] = useState<Estado>({ fase: 'inicio' });
	const [arrastrando, setArrastrando] = useState(false);
	const [camaraAbierta, setCamaraAbierta] = useState(false);
	const galeria = useRef<HTMLInputElement>(null);
	const camara = useRef<HTMLInputElement>(null);
	const vistaActual = useRef<string | null>(null);
	const seccionResultado = useRef<HTMLElement>(null);

	useEffect(() => {
		return () => {
			if (vistaActual.current) URL.revokeObjectURL(vistaActual.current);
		};
	}, []);

	// En pantallas angostas el resultado queda debajo de la subida: al empezar el análisis
	// (y al terminar) se baja solo hasta la foto para verla sin tener que hacer scroll.
	const fase = estado.fase;
	const tieneVista = fase !== 'inicio' && !!estado.vista;
	useEffect(() => {
		const sec = seccionResultado.current;
		if (
			!sec ||
			(fase !== 'analizando' && fase !== 'listo' && fase !== 'error')
		) {
			return;
		}
		if (fase === 'analizando' && !tieneVista) return;
		const { top } = sec.getBoundingClientRect();
		if (top < window.innerHeight * 0.3) return; // ya está a la vista (pantalla ancha)
		const sinMovimiento = matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		sec.scrollIntoView({
			behavior: sinMovimiento ? 'auto' : 'smooth',
			block: 'start',
		});
	}, [fase, tieneVista]);

	const analizar = useCallback(async (archivo: File) => {
		if (vistaActual.current) URL.revokeObjectURL(vistaActual.current);
		let vista = '';
		try {
			setEstado({ fase: 'preparando', vista: '' });
			const blob = await prepararImagen(archivo);
			vista = URL.createObjectURL(blob);
			vistaActual.current = vista;
			setEstado({ fase: 'analizando', vista });
			const control = new AbortController();
			const limite = setTimeout(() => control.abort(), 90_000);
			const resp = await fetch('/api/analizar', {
				method: 'POST',
				headers: { 'Content-Type': 'image/jpeg' },
				body: blob,
				signal: control.signal,
			}).finally(() => clearTimeout(limite));
			let cuerpo: unknown = null;
			try {
				cuerpo = await resp.json();
			} catch {
				cuerpo = null;
			}
			if (!resp.ok || !cuerpo || (cuerpo as { error?: string }).error) {
				const msg =
					(cuerpo as { error?: string } | null)?.error ??
					(resp.status === 413
						? 'La imagen es demasiado grande.'
						: 'No se pudo analizar la imagen. Intenta de nuevo.');
				throw new Error(msg);
			}
			setEstado({ fase: 'listo', vista, datos: cuerpo as TipoResultado });
		} catch (e) {
			const abortado = e instanceof DOMException && e.name === 'AbortError';
			setEstado({
				fase: 'error',
				vista: vista || undefined,
				mensaje: abortado
					? 'El análisis tardó demasiado. Intenta con otra foto.'
					: e instanceof Error
						? e.message
						: 'Ocurrió un error inesperado.',
			});
		}
	}, []);

	const elegir = (lista: FileList | null) => {
		const f = lista?.[0];
		if (f) void analizar(f);
	};

	// Abre la cámara dentro de la página; si el navegador no puede (por ejemplo, sin HTTPS), usa el campo de archivo.
	const abrirCamara = () => {
		const puede =
			window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
		if (puede) setCamaraAbierta(true);
		else camara.current?.click();
	};

	const fallaCamara = useCallback((mensaje: string) => {
		setCamaraAbierta(false);
		setEstado({ fase: 'error', mensaje });
	}, []);
	const cerrarCamara = useCallback(() => setCamaraAbierta(false), []);
	const fotoDeCamara = useCallback(
		(archivo: File) => {
			setCamaraAbierta(false);
			void analizar(archivo);
		},
		[analizar],
	);

	const reiniciar = () => {
		if (vistaActual.current) URL.revokeObjectURL(vistaActual.current);
		vistaActual.current = null;
		setEstado({ fase: 'inicio' });
		if (galeria.current) galeria.current.value = '';
		if (camara.current) camara.current.value = '';
	};

	const ocupado = estado.fase === 'preparando' || estado.fase === 'analizando';

	return (
		<>
			{camaraAbierta && (
				<Camara
					onCerrar={cerrarCamara}
					onError={fallaCamara}
					onFoto={fotoDeCamara}
				/>
			)}
			<div className='grid gap-8 sm:gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'>
				<section aria-labelledby='t-foto' className='flex flex-col gap-5'>
					<h2 className='flex items-center gap-3 text-3xl' id='t-foto'>
						<span className='bg-tinta text-amarillo grid size-10 place-items-center text-2xl'>
							1
						</span>
						Elige una foto
					</h2>
					<input
						accept='image/*'
						className='sr-only'
						id='archivo'
						onChange={e => elegir(e.target.files)}
						ref={galeria}
						type='file'
					/>
					<input
						accept='image/*'
						capture='environment'
						className='sr-only'
						id='camara'
						onChange={e => elegir(e.target.files)}
						ref={camara}
						type='file'
					/>
					<div
						className={`tarjeta flex min-h-64 flex-col items-center justify-center gap-5 p-6 text-center transition-colors duration-200 sm:min-h-72 ${
							arrastrando ? 'bg-amarillo' : 'bg-superficie'
						}`}
						onDragLeave={() => setArrastrando(false)}
						onDragOver={e => {
							e.preventDefault();
							setArrastrando(true);
						}}
						onDrop={e => {
							e.preventDefault();
							setArrastrando(false);
							if (!ocupado) elegir(e.dataTransfer.files);
						}}
					>
						<div className='border-linea flex w-full flex-1 flex-col items-center justify-center gap-4 border-2 border-dashed px-4 py-6'>
							<FlechaUPN
								className='size-16'
								color={arrastrando ? '#0F0F0F' : '#0F0F0F'}
							/>
							<p className='text-lg font-semibold'>
								<span className='hidden [@media(pointer:fine)]:inline'>
									Arrastra una foto aquí
								</span>
								<span className='[@media(pointer:fine)]:hidden'>
									Elige una foto de la mazorca
								</span>
							</p>
							<p className='text-suave -mt-3 text-sm'>
								<span className='hidden [@media(pointer:fine)]:inline'>
									o elige cómo subirla
								</span>
								<span className='[@media(pointer:fine)]:hidden'>
									desde tu galería o con la cámara
								</span>
							</p>
						</div>
						<div className='flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4'>
							<button
								className='btn btn-negro'
								disabled={ocupado}
								onClick={() => galeria.current?.click()}
								type='button'
							>
								Subir foto
							</button>
							<button
								className='btn btn-claro'
								disabled={ocupado}
								onClick={abrirCamara}
								type='button'
							>
								Tomar foto
							</button>
						</div>
					</div>
					<ul className='text-suave border-amarillo flex flex-col gap-1 border-l-4 pl-4 text-sm'>
						<li>Una sola mazorca por foto, bien iluminada.</li>
						<li>
							Acércate hasta que la mazorca ocupe buena parte de la imagen.
						</li>
						<li>Sin otras mazorcas ni objetos grandes alrededor.</li>
					</ul>
					{estado.fase === 'listo' && (
						<button
							className='btn btn-claro w-fit'
							onClick={reiniciar}
							type='button'
						>
							Analizar otra foto
						</button>
					)}
				</section>

				<section
					aria-labelledby='t-res'
					className='min-w-0 scroll-mt-4'
					ref={seccionResultado}
				>
					<h2 className='flex items-center gap-3 text-3xl' id='t-res'>
						<span className='bg-tinta text-amarillo grid size-10 place-items-center text-2xl'>
							2
						</span>
						Resultado
					</h2>
					<div aria-live='polite' className='mt-5'>
						{estado.fase === 'inicio' && (
							<p className='border-linea text-suave border-2 border-dashed p-8 text-center'>
								Aquí verás la foto con las zonas marcadas, el porcentaje de la
								mazorca afectado y si pasa o se descarta.
							</p>
						)}
						{ocupado && (
							<div className='flex flex-col gap-4'>
								<div className='tarjeta bg-amarillo flex items-center gap-4 p-4'>
									<FlechaUPN carga className='size-12 shrink-0' />
									<p className='font-semibold'>{TEXTO[estado.fase]}</p>
								</div>
								{estado.vista && (
									<img
										alt='Foto que se está analizando'
										className='border-linea max-h-[60vh] w-full border-2 bg-white object-contain opacity-80'
										src={estado.vista}
									/>
								)}
							</div>
						)}
						{estado.fase === 'error' && (
							<div className='flex flex-col gap-4' role='alert'>
								<p className='border-linea border-2 bg-(--no-fondo) p-4 font-medium text-(--no)'>
									{estado.mensaje}
								</p>
								<button
									className='btn btn-claro w-fit'
									onClick={reiniciar}
									type='button'
								>
									Intentar de nuevo
								</button>
							</div>
						)}
						{estado.fase === 'listo' &&
							(estado.datos.mazorca_detectada === false ? (
								<SinMazorca
									mensaje={estado.datos.mensaje}
									onOtraFoto={reiniciar}
									src={estado.vista}
								/>
							) : (
								<Resultado datos={estado.datos} src={estado.vista} />
							))}
					</div>
				</section>
			</div>
		</>
	);
}
