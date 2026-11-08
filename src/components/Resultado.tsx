/* eslint-disable max-len */
/* eslint-disable @next/next/no-img-element */
'use client';

import { CLASES, VEREDICTO, type ResultadoAnalisis } from '../lib/clases';

const TONO = {
	ok: 'bg-(--ok-fondo) text-(--ok)',
	medio: 'bg-(--medio-fondo) text-(--medio)',
	no: 'bg-(--no-fondo) text-(--no)',
} as const;

function Icono({ tono }: { tono: 'ok' | 'medio' | 'no' }) {
	const d =
		tono === 'no'
			? 'M6 6l12 12M18 6L6 18'
			: tono === 'ok'
				? 'M5 13l4 4L19 7'
				: 'M12 7v6m0 4h.01';
	return (
		<svg
			aria-hidden='true'
			className='size-9 shrink-0'
			fill='none'
			stroke='currentColor'
			strokeLinecap='round'
			strokeLinejoin='round'
			strokeWidth='2.4'
			viewBox='0 0 24 24'
		>
			<path d={d} />
		</svg>
	);
}

export default function Resultado({
	src,
	datos,
}: {
	src: string;
	datos: ResultadoAnalisis;
}) {
	const v = VEREDICTO[datos.categoria];
	const zonas = datos.zonas;
	const clases = Object.entries(datos.porcentaje_por_clase)
		.filter(([, p]) => p > 0)
		.sort((a, b) => b[1] - a[1]);

	return (
		<div className='aparecer flex flex-col gap-8'>
			<div
				className={`tarjeta flex items-center gap-4 p-4 sm:gap-5 sm:p-5 ${TONO[v.tono]}`}
				role='status'
			>
				<span className='bg-tinta grid size-14 shrink-0 place-items-center text-white'>
					<Icono tono={v.tono} />
				</span>
				<div>
					<p className='font-display text-4xl leading-none tracking-wide sm:text-5xl'>
						{v.titulo}
					</p>
					<p className='mt-1 text-sm font-medium'>{v.detalle}</p>
				</div>
			</div>

			<figure className='tarjeta relative overflow-hidden'>
				<img
					alt='Foto analizada con las zonas detectadas marcadas'
					className='block h-auto max-h-[70vh] w-full object-contain'
					src={src}
				/>
				<svg
					aria-hidden='true'
					className='pointer-events-none absolute inset-0 size-full'
					preserveAspectRatio='none'
					viewBox='0 0 1 1'
				>
					{zonas.map((z, i) => (
						<rect
							fill='none'
							height={z.alto}
							key={i}
							opacity={Math.max(0.45, Math.min(1, z.confianza * 2))}
							stroke={CLASES[z.clase]?.color ?? '#fff'}
							strokeWidth='2.5'
							vectorEffect='non-scaling-stroke'
							width={z.ancho}
							x={z.x}
							y={z.y}
						/>
					))}
				</svg>
			</figure>

			<section aria-labelledby='t-por-que'>
				<h3 className='border-amarillo border-b-4 pb-1 text-3xl' id='t-por-que'>
					Por qué
				</h3>
				<p className='mt-3 text-lg'>
					Defectos en{' '}
					<strong className='bg-amarillo px-1.5'>
						{datos.area_defectos_pct} %
					</strong>{' '}
					de la mazorca.
				</p>
				<p className='text-suave text-sm'>
					La mazorca ocupa {datos.mazorca_pct_imagen} % de la foto.
				</p>
				{datos.motivos.length > 0 && (
					<ul className='mt-3 list-disc pl-5'>
						{datos.motivos.map(m => (
							<li key={m}>{m}</li>
						))}
					</ul>
				)}
				{datos.mazorca_pct_imagen < 4 && (
					<p className='border-linea mt-4 border-2 bg-(--medio-fondo) p-3 text-sm font-medium text-(--medio)'>
						La mazorca ocupa muy poco de la foto; acércate para un resultado más
						fiable.
					</p>
				)}
			</section>

			{clases.length > 0 && (
				<section aria-labelledby='t-clases'>
					<h3
						className='border-amarillo border-b-4 pb-1 text-3xl'
						id='t-clases'
					>
						Qué se encontró
					</h3>
					<ul className='mt-4 flex flex-col gap-5'>
						{clases.map(([clase, pct]) => {
							const c = CLASES[clase];
							return (
								<li key={clase}>
									<div className='flex items-baseline justify-between gap-3'>
										<span className='flex items-center gap-2 font-semibold'>
											<span
												aria-hidden='true'
												className='border-linea inline-block size-4 border-2'
												style={{ background: c?.color }}
											/>
											{c?.nombre ?? clase}
										</span>
										<span className='font-display text-2xl tabular-nums'>
											{pct} %
										</span>
									</div>
									<div className='bg-suave-amarillo border-linea mt-1 h-3 border-2'>
										<div
											className='bg-tinta h-full'
											style={{ width: `${Math.min(100, pct)}%` }}
										/>
									</div>
									<p className='text-suave mt-1 text-xs'>{c?.significado}</p>
								</li>
							);
						})}
					</ul>
				</section>
			)}

			{zonas.length > 0 && (
				<section aria-labelledby='t-zonas'>
					<h3 className='border-amarillo border-b-4 pb-1 text-3xl' id='t-zonas'>
						Zonas marcadas ({zonas.length})
					</h3>
					<div className='border-linea mt-3 max-h-64 overflow-auto border-2 bg-white'>
						<table className='w-full text-left text-sm'>
							<thead className='bg-tinta sticky top-0 text-white'>
								<tr>
									<th className='p-2 font-semibold' scope='col'>
										Zona
									</th>
									<th className='p-2 text-right font-semibold' scope='col'>
										Confianza
									</th>
								</tr>
							</thead>
							<tbody>
								{zonas.slice(0, 40).map((z, i) => (
									<tr className='border-borde border-t' key={i}>
										<td className='p-2'>
											<span
												aria-hidden='true'
												className='border-linea mr-2 inline-block size-3 border align-middle'
												style={{ background: CLASES[z.clase]?.color }}
											/>
											{CLASES[z.clase]?.nombre ?? z.clase}
										</td>
										<td className='p-2 text-right tabular-nums'>
											{Math.round(z.confianza * 100)} %
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			<p className='border-borde text-suave border-t pt-4 text-xs'>
				Apoyo a la inspección: es un resultado automático y preliminar. La
				decisión final es de la persona.
			</p>
		</div>
	);
}
