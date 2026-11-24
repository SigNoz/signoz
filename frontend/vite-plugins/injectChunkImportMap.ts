import type { Plugin } from 'vite';
import { applyChunkImportMap } from './applyChunkImportMap';

export function injectChunkImportMap(): Plugin {
	return {
		name: 'signoz:inject-chunk-import-map',
		generateBundle: {
			order: 'post',
			handler(_options, bundle): void {
				applyChunkImportMap(bundle);
			},
		},
	};
}
