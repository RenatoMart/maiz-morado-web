import LogoMarca from './LogoMarca';

/** Logo para fondos oscuros: flechas amarillas y texto blanco, con la silueta completa de las flechas. */
export default function Logo({
	className = 'h-12 w-auto sm:h-14',
}: {
	className?: string;
}) {
	return (
		<LogoMarca
			className={className}
			flechas='#FBC105'
			tinta='#FFFFFF'
			variante='completa'
		/>
	);
}
