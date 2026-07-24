// Maps every SVG/PNG under `src/assets/Icons` and `src/assets/Logos` by file name
// to its bundled reference, so any `/assets/Icons/<name>` or `/assets/Logos/<name>`
// in dashboard JSON resolves without a hand-maintained list. `import.meta.glob` is
// Vite-only, so it lives in this tiny module that jest mocks (see the test).
//
// Icons are the always-present set (shown in the picker), so we let Vite inline the
// small ones as data URIs — they ship in the bundle and render with no network
// call. Logos are a large, JSON-only catalogue, so `?url` keeps them as emitted
// files fetched (and cached) on demand rather than bloating the bundle.
const iconModules = import.meta.glob('../../assets/Icons/**/*.svg', {
	eager: true,
	import: 'default',
});

const logoModules = import.meta.glob('../../assets/Logos/**/*.{svg,png}', {
	eager: true,
	query: '?url',
	import: 'default',
});

/** Maps each asset's file name (without extension) to its bundled reference. */
function toNameMap(modules: Record<string, unknown>): Record<string, string> {
	return Object.entries(modules).reduce<Record<string, string>>(
		(acc, [path, ref]) => {
			const name = path
				.split('/')
				.pop()
				?.replace(/\.(svg|png)$/, '');
			if (name) {
				acc[name] = ref as string;
			}
			return acc;
		},
		{},
	);
}

export const ICON_URLS = toNameMap(iconModules);
export const LOGO_URLS = toNameMap(logoModules);
