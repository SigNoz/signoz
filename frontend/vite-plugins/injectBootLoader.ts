import { buildBootLoader } from './buildBootLoader';
import { BOOT_GUARD_ID } from './types';

const GUARD = new RegExp(`<script id="${BOOT_GUARD_ID}">[\\s\\S]*?</script>`);
const IMPORT_MAP = /[ \t]*<script type="importmap">[\s\S]*?<\/script>\n?/;
const ENTRY_SCRIPT =
	/<script type="module"[^>]*\ssrc="([^"]+)"[^>]*><\/script>/;

export function injectBootLoader(html: string, importMapJson: string): string {
	const staticMap = IMPORT_MAP.exec(html);
	const entry = ENTRY_SCRIPT.exec(html);
	if (!staticMap || !entry) {
		throw new Error(
			'index.html needs the import map Vite writes for build.chunkImportMap and a module entry script',
		);
	}

	const stripped = html.replace(staticMap[0], '').replace(entry[0], '');
	const guard = GUARD.exec(stripped);
	if (!guard) {
		throw new Error(`index.html needs the #${BOOT_GUARD_ID} script`);
	}

	const at = guard.index + guard[0].length;
	const loader = buildBootLoader(
		JSON.stringify(JSON.parse(importMapJson)),
		entry[1],
	);

	return stripped.slice(0, at) + loader + stripped.slice(at);
}
