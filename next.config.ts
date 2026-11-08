import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Quita el indicador de Next.js (el círculo de abajo a la izquierda) en desarrollo.
	devIndicators: false,
	// Vercel no necesita 'standalone'; solo se usa al construir la imagen de Docker.
	output: process.env.VERCEL ? undefined : 'standalone',
	// En desarrollo, las llamadas a la función de Python se redirigen al servidor local (scripts/servidor_local.py).
	async rewrites() {
		if (process.env.NODE_ENV !== 'development') return [];
		return [
			{
				source: '/api/analizar',
				destination: 'http://127.0.0.1:8000/api/analizar',
			},
		];
	},
};

export default nextConfig;
