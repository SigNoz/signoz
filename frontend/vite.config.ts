import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

import path from 'path';

export default ({ mode }: { mode: string }) => {
	const env = loadEnv(mode, process.cwd(), '');
	return {
		plugins: [react()],
		optimizeDeps: {
			include: ['rc-util/es/hooks/useEvent'],
		},
		server: {
			port: 8080,
			strictPort: false,
			proxy: {
				'/tunnel': {
					target: env.VITE_TUNNEL_DOMAIN,
					changeOrigin: true,
				},
			},
		},
		resolve: {
			alias: {
				utils: path.resolve(__dirname, './src/utils'),
				parser: path.resolve(__dirname, './src/parser'),
				types: path.resolve(__dirname, './src/types'),
				constants: path.resolve(__dirname, './src/constants'),
				components: path.resolve(__dirname, './src/components'),
				hooks: path.resolve(__dirname, './src/hooks'),
				providers: path.resolve(__dirname, './src/providers'),
				api: path.resolve(__dirname, './src/api'),
				store: path.resolve(__dirname, './src/store'),
				pages: path.resolve(__dirname, './src/pages'),
				assets: path.resolve(__dirname, './src/assets'),
				container: path.resolve(__dirname, './src/container'),
				AppRoutes: path.resolve(__dirname, './src/AppRoutes'),
				lib: path.resolve(__dirname, './src/lib'),
				periscope: path.resolve(__dirname, './src/periscope'),
				modules: path.resolve(__dirname, './src/modules'),
			},
		},
	};
};
