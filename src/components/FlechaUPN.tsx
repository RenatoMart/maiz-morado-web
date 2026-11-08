import { FLECHA_DER, FLECHA_IZQ } from './logoDatos';

/** Flecha del logo, partida en dos mitades. Con `carga` las mitades suben por turnos. */
export default function FlechaUPN({
	className = 'size-10',
	color = '#0F0F0F',
	carga = false,
}: {
	className?: string;
	color?: string;
	carga?: boolean;
}) {
	return (
		<svg
			aria-hidden='true'
			className={`${className} ${carga ? 'flecha-carga' : ''}`}
			fill={color}
			viewBox='30 -40 500 720'
		>
			<polygon className='izq' points={FLECHA_IZQ} />
			<polygon className='der' points={FLECHA_DER} />
		</svg>
	);
}
