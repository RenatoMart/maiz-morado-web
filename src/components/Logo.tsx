import LogoMarca from './LogoMarca';

export default function Logo({
	className = 'h-9 w-auto',
}: {
	className?: string;
}) {
	return <LogoMarca className={className} flechas='#FBC105' tinta='#FFFFFF' />;
}
