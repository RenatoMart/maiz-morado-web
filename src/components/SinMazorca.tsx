/* eslint-disable @next/next/no-img-element */
export default function SinMazorca({
	src,
	mensaje,
	onOtraFoto,
}: {
	src: string;
	mensaje: string;
	onOtraFoto: () => void;
}) {
	return (
		<div className='aparecer flex flex-col gap-6'>
			<div
				className='tarjeta flex items-center gap-4 bg-(--medio-fondo) p-4 text-(--medio) sm:gap-5 sm:p-5'
				role='status'
			>
				<span className='bg-tinta grid size-14 shrink-0 place-items-center text-white'>
					<svg
						aria-hidden='true'
						className='size-9'
						fill='none'
						stroke='currentColor'
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2.4'
						viewBox='0 0 24 24'
					>
						<path d='M12 7v6m0 4h.01' />
					</svg>
				</span>
				<div>
					<p className='font-display text-4xl leading-none tracking-wide sm:text-5xl'>
						No hay una mazorca
					</p>
					<p className='mt-1 text-sm font-medium'>{mensaje}</p>
				</div>
			</div>

			<img
				alt='Foto enviada, en la que no se reconoce una mazorca'
				className='tarjeta block h-auto max-h-[50vh] w-full object-contain'
				src={src}
			/>

			<section aria-labelledby='t-consejos'>
				<h3
					className='border-amarillo border-b-4 pb-1 text-3xl'
					id='t-consejos'
				>
					Para que funcione
				</h3>
				<ul className='mt-3 list-disc pl-5'>
					<li>Fotografía una mazorca de maíz morado, sola y bien iluminada.</li>
					<li>Acércate hasta que ocupe buena parte de la imagen.</li>
					<li>Evita fondos muy oscuros o con otros objetos grandes.</li>
				</ul>
			</section>

			<button
				className='btn btn-negro w-fit'
				onClick={onOtraFoto}
				type='button'
			>
				Probar con otra foto
			</button>
		</div>
	);
}
