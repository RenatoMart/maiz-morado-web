'use client';
/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, max-len */

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
	/** Se llama con la foto tomada. */
	onFoto: (archivo: File) => void;
	/** Se llama al cerrar sin tomar foto. */
	onCerrar: () => void;
	/** Se llama si la cámara no se pudo abrir (permiso negado, sin cámara, etc.). */
	onError: (mensaje: string) => void;
};

const MENSAJES: Record<string, string> = {
	NotAllowedError:
		'No diste permiso para usar la cámara. Actívalo en el navegador o sube una foto desde la galería.',
	NotFoundError: 'Este equipo no tiene cámara. Sube una foto desde la galería.',
	NotReadableError:
		'La cámara está en uso por otra aplicación. Ciérrala e inténtalo de nuevo.',
};

/** Cámara dentro de la página: vista en vivo con la cámara trasera y botón para capturar. */
export default function Camara({ onFoto, onCerrar, onError }: Props) {
	const video = useRef<HTMLVideoElement>(null);
	const flujo = useRef<MediaStream | null>(null);
	const [lista, setLista] = useState(false);
	const [lado, setLado] = useState<'environment' | 'user'>('environment');

	const detener = useCallback(() => {
		flujo.current?.getTracks().forEach(t => t.stop());
		flujo.current = null;
	}, []);

	useEffect(() => {
		let activo = true;
		setLista(false);
		(async () => {
			try {
				const f = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: { ideal: lado },
						width: { ideal: 1920 },
						height: { ideal: 1080 },
					},
					audio: false,
				});
				if (!activo) {
					f.getTracks().forEach(t => t.stop());
					return;
				}
				detener();
				flujo.current = f;
				if (video.current) {
					video.current.srcObject = f;
					await video.current.play().catch(() => {});
				}
				setLista(true);
			} catch (e) {
				const nombre = e instanceof DOMException ? e.name : '';
				onError(
					MENSAJES[nombre] ??
						'No se pudo abrir la cámara. Sube una foto desde la galería.',
				);
			}
		})();
		return () => {
			activo = false;
			detener();
		};
	}, [lado, detener, onError]);

	useEffect(() => {
		const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
		addEventListener('keydown', tecla);
		const previo = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			removeEventListener('keydown', tecla);
			document.body.style.overflow = previo;
		};
	}, [onCerrar]);

	const capturar = () => {
		const v = video.current;
		if (!v || !v.videoWidth) return;
		const lienzo = document.createElement('canvas');
		lienzo.width = v.videoWidth;
		lienzo.height = v.videoHeight;
		lienzo.getContext('2d')?.drawImage(v, 0, 0);
		lienzo.toBlob(
			blob => {
				if (!blob)
					return onError('No se pudo guardar la foto. Inténtalo de nuevo.');
				detener();
				onFoto(new File([blob], 'foto-camara.jpg', { type: 'image/jpeg' }));
			},
			'image/jpeg',
			0.92,
		);
	};

	return (
		<div
			aria-label='Cámara'
			aria-modal='true'
			className='fixed inset-0 z-50 flex flex-col bg-black'
			role='dialog'
		>
			<div className='relative min-h-0 flex-1'>
				<video
					autoPlay
					className='size-full object-contain'
					muted
					playsInline
					ref={video}
				/>
				{!lista && (
					<p className='absolute inset-0 grid place-items-center text-center text-white'>
						Abriendo la cámara…
					</p>
				)}
				<p className='bg-tinta/70 absolute inset-x-0 top-0 p-3 text-center text-sm font-medium text-white'>
					Apunta a la mazorca para que ocupe buena parte de la imagen
				</p>
			</div>
			<div className='bg-tinta flex items-center justify-between gap-4 px-6 py-5'>
				<button
					className='text-amarillo min-h-12 min-w-24 text-base font-semibold'
					onClick={onCerrar}
					type='button'
				>
					Cancelar
				</button>
				<button
					aria-label='Tomar foto'
					className='bg-amarillo border-claro size-18 rounded-full border-4 transition-transform duration-150 active:scale-90 disabled:opacity-40'
					disabled={!lista}
					onClick={capturar}
					type='button'
				/>
				<button
					aria-label='Cambiar de cámara'
					className='text-amarillo min-h-12 min-w-24 text-right text-base font-semibold'
					onClick={() =>
						setLado(l => (l === 'environment' ? 'user' : 'environment'))
					}
					type='button'
				>
					Girar
				</button>
			</div>
		</div>
	);
}
