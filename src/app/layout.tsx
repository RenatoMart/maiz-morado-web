import type { Metadata, Viewport } from 'next';
import { Barlow, Bebas_Neue } from 'next/font/google';
import './globals.css';

const titulo = Bebas_Neue({
	variable: '--font-titulo',
	subsets: ['latin'],
	weight: '400',
});

const cuerpo = Barlow({
	variable: '--font-cuerpo',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
});

const TITULO = 'UPN · Inspección de maíz morado';
const DESCRIPCION =
	'Sistema de visión artificial que detecta defectos visibles en mazorcas de maíz morado y orienta su clasificación de calidad.';

// Dirección absoluta para las vistas previas (WhatsApp, Facebook, etc.): Vercel la entrega en el entorno.
const DOMINIO =
	process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const metadata: Metadata = {
	metadataBase: new URL(
		DOMINIO ? `https://${DOMINIO}` : 'http://localhost:3000',
	),
	title: TITULO,
	description: DESCRIPCION,
	applicationName: 'Inspección de maíz morado',
	openGraph: {
		type: 'website',
		locale: 'es_PE',
		siteName: 'Universidad Privada del Norte',
		title: TITULO,
		description: DESCRIPCION,
	},
	twitter: {
		card: 'summary_large_image',
		title: TITULO,
		description: DESCRIPCION,
	},
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: '#FBC105',
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='es'>
			<body
				suppressHydrationWarning
				className={`${titulo.variable} ${cuerpo.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
