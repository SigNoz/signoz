import { applyChunkImportMap } from '../applyChunkImportMap';
import type { Bundle } from '../types';

const html = [
	'<head>',
	'<base href="[[.BaseHref]]" />',
	'<script id="signoz-boot-guard"></script>',
	'<script type="importmap">{"imports":{"./assets/a.js":"./assets/a-AAAA.js","./assets/css-only.js":"./assets/css-only-BBBB.js"}}</script>',
	'</head>',
	'<body>',
	'<script type="module" crossorigin src="./assets/index-CCCC.js"></script>',
	'</body>',
].join('\n');

function makeBundle(): Bundle {
	return {
		'index.html': { type: 'asset', source: html },
		'importmap.json': {
			type: 'asset',
			source: '{"imports":{"./assets/a.js":"./assets/a-AAAA.js"}}',
		},
		'assets/index-CCCC.js': { type: 'chunk' },
	};
}

function pageOf(bundle: Bundle): string {
	const page = bundle['index.html'];
	return page.type === 'asset' ? String(page.source) : '';
}

describe('applyChunkImportMap', () => {
	it('moves the import map and the entry into the boot loader', () => {
		const bundle = makeBundle();

		applyChunkImportMap(bundle);

		expect(pageOf(bundle)).not.toContain('<script type="importmap">');
		expect(pageOf(bundle)).not.toContain('<script type="module"');
		expect(pageOf(bundle)).toContain('./assets/a-AAAA.js');
		expect(pageOf(bundle)).toContain('DOMContentLoaded');
	});

	it('takes the map from importmap.json, which Vite prunes after it embeds the page copy', () => {
		const bundle = makeBundle();

		applyChunkImportMap(bundle);

		expect(pageOf(bundle)).toContain('./assets/a-AAAA.js');
		expect(pageOf(bundle)).not.toContain('css-only');
	});

	it('drops importmap.json from the output', () => {
		const bundle = makeBundle();

		applyChunkImportMap(bundle);

		expect(bundle['importmap.json']).toBeUndefined();
		expect(bundle['assets/index-CCCC.js']).toBeDefined();
	});

	it('leaves a bundle without index.html alone', () => {
		const bundle = makeBundle();
		delete bundle['index.html'];

		expect(() => applyChunkImportMap(bundle)).not.toThrow();
		expect(bundle['importmap.json']).toBeDefined();
	});

	it('throws when Vite did not write importmap.json', () => {
		const bundle = makeBundle();
		delete bundle['importmap.json'];

		expect(() => applyChunkImportMap(bundle)).toThrow(
			'importmap.json is missing',
		);
	});

	it('throws when index.html has no import map', () => {
		const bundle = makeBundle();
		bundle['index.html'] = {
			type: 'asset',
			source: html.replace('type="importmap"', 'type="text/plain"'),
		};

		expect(() => applyChunkImportMap(bundle)).toThrow('import map');
	});
});
