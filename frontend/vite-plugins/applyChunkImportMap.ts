import { injectBootLoader } from './injectBootLoader';
import type { Bundle } from './types';
import { IMPORT_MAP_FILE } from './types';

export function applyChunkImportMap(bundle: Bundle): void {
	const html = bundle['index.html'];
	// Worker sub-builds run the plugins of the main build and have no index.html.
	if (html?.type !== 'asset') {
		return;
	}

	const map = bundle[IMPORT_MAP_FILE];
	if (map?.type !== 'asset') {
		throw new Error(`${IMPORT_MAP_FILE} is missing from the bundle`);
	}

	// The copy Vite embedded in index.html still lists the pure CSS chunks it
	// removes afterwards, so the loader takes the map from the file.
	html.source = injectBootLoader(String(html.source), String(map.source));
	delete bundle[IMPORT_MAP_FILE];
}
