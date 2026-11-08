import { FLECHA_DER, FLECHA_IZQ, LETRAS_UPN, LINEAS_SUB } from './logoDatos';

type Props = {
	/** Color de las flechas y del texto. */
	tinta?: string;
	/** Color de las flechas si debe ser distinto al del texto. */
	flechas?: string;
	/** `corta`: flechas y UPN (el nombre de la universidad se omite). `completa`: con el nombre. */
	variante?: 'corta' | 'completa';
	className?: string;
};

/** Logo de la UPN en vectores (trazado en scripts/trazar_logo.py). */
export default function LogoMarca({
	tinta = '#0F0F0F',
	flechas,
	variante = 'corta',
	className = 'h-10 w-auto',
}: Props) {
	const completa = variante === 'completa';
	return (
		<svg
			aria-label='Universidad Privada del Norte'
			className={className}
			role='img'
			viewBox='40 40 1030 620'
		>
			<g fill={flechas ?? tinta}>
				<polygon points={FLECHA_IZQ} />
				<polygon points={FLECHA_DER} />
			</g>
			<g fill={tinta} stroke={tinta} strokeLinejoin='round' strokeWidth='8'>
				{LETRAS_UPN.map((d, i) => (
					<path d={d} key={i} />
				))}
			</g>
			{completa && (
				<g fill={tinta}>
					{LINEAS_SUB.flat().map((d, i) => (
						<path d={d} key={i} />
					))}
				</g>
			)}
		</svg>
	);
}
