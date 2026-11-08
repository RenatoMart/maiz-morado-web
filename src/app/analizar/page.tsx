import type { Metadata } from 'next';
import Link from 'next/link';
import Analizador from '../../components/Analizador';
import Logo from '../../components/Logo';

export const metadata: Metadata = {
	title: 'Analizar una mazorca · UPN',
};

export default function Analizar() {
	return (
		<div className='min-h-dvh'>
			<header className='bg-tinta border-amarillo border-b-4'>
				<div className='mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 sm:px-10'>
					<Link aria-label='Volver al inicio' href='/'>
						<Logo />
					</Link>
					<p className='font-display text-amarillo hidden text-xl tracking-wider sm:block'>
						Inspección de maíz morado
					</p>
					<Link
						className='text-amarillo text-sm font-semibold underline-offset-4 hover:underline'
						href='/'
					>
						Inicio
					</Link>
				</div>
			</header>

			<main className='mx-auto w-full max-w-6xl px-6 py-10 sm:px-10'>
				<h1
					className='aparecer mb-8 text-5xl text-balance sm:mb-10 sm:text-7xl'
					style={{ animationDelay: '60ms' }}
				>
					<span className='bg-amarillo box-decoration-clone px-3 py-1'>
						Analiza una mazorca
					</span>
				</h1>
				<Analizador />
			</main>

			<footer className='border-linea mx-auto mt-6 w-full max-w-6xl border-t-2 px-6 py-6 text-sm sm:px-10'>
				<p className='text-suave'>
					Proyecto de investigación de Ingeniería Industrial, UPN. Resultados
					preliminares: úsalo como apoyo a la inspección, no como única fuente
					de decisión. Las fotos se analizan y no se guardan.
				</p>
			</footer>
		</div>
	);
}
