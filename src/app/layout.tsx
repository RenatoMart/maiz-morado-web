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

export const metadata: Metadata = {
	title: 'UPN · Inspección de maíz morado',
	description:
		'Sistema de visión artificial que detecta defectos visibles en mazorcas de maíz morado y orienta su clasificación de calidad.',
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
