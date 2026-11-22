import { injectBootLoader } from '../injectBootLoader';

const importMap = {
	imports: { './assets/v-react-KEY.js': './assets/v-react-AAAA.js' },
};

const mapJson = JSON.stringify(importMap);

const html = [
	'<head>',
	'<base href="[[.BaseHref]]" />',
	'<script id="signoz-boot-guard">window.__signozBoot = {};</script>',
	'<script type="importmap">' + JSON.stringify(importMap, null, 1) + '</script>',
	'<link rel="modulepreload" crossorigin href="./assets/v-react-AAAA.js">',
	'</head>',
	'<body>',
	'<div id="root"></div>',
	'<script type="module" crossorigin src="./assets/index-CCCC.js"></script>',
	'</body>',
].join('\n');

function loaderScript(output: string): string {
	const afterGuard = output.split('window.__signozBoot = {};</script>')[1];
	const match = /^<script>([\s\S]*?)<\/script>/.exec(afterGuard);
	if (!match) {
		throw new Error('no loader after the guard');
	}
	return match[1];
}

function runLoader(
	script: string,
	boot: { supported: boolean; fail: jest.Mock },
): HTMLScriptElement[] {
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	Object.assign(window, { __signozBoot: boot });

	const loader = document.createElement('script');
	loader.textContent = script;
	document.body.appendChild(loader);

	return Array.from(document.head.querySelectorAll('script'));
}

describe('injectBootLoader', () => {
	it('removes the static import map and module script', () => {
		const output = injectBootLoader(html, mapJson);

		expect(output).not.toContain('<script type="importmap">');
		expect(output).not.toContain('<script type="module"');
	});

	it('puts the loader right after the guard and keeps the rest of the page', () => {
		const output = injectBootLoader(html, mapJson);

		expect(output).toMatch(
			/window\.__signozBoot = \{\};<\/script><script>\(function\(\)\{/,
		);
		expect(output).toContain('<base href="[[.BaseHref]]" />');
		expect(output).toContain('<div id="root"></div>');
		expect(output).toContain(
			'<link rel="modulepreload" crossorigin href="./assets/v-react-AAAA.js">',
		);
	});

	it('preloads the entry', () => {
		const output = injectBootLoader(html, mapJson);

		expect(output).toContain(
			'<link rel="modulepreload" crossorigin href="./assets/index-CCCC.js">',
		);
	});

	it('waits for DOMContentLoaded before it adds the entry', () => {
		const script = loaderScript(injectBootLoader(html, mapJson));

		expect(script).toContain('DOMContentLoaded');
	});

	it('adds the import map before the entry module', () => {
		const boot = { supported: true, fail: jest.fn() };
		const scripts = runLoader(
			loaderScript(injectBootLoader(html, mapJson)),
			boot,
		);

		expect(scripts.map((script) => script.type)).toStrictEqual([
			'importmap',
			'module',
		]);
		expect(JSON.parse(scripts[0].textContent ?? '')).toStrictEqual(importMap);
		expect(scripts[1].getAttribute('src')).toBe('./assets/index-CCCC.js');
		expect(boot.fail).not.toHaveBeenCalled();
	});

	it('reports a failed entry load', () => {
		const boot = { supported: true, fail: jest.fn() };
		const scripts = runLoader(
			loaderScript(injectBootLoader(html, mapJson)),
			boot,
		);

		scripts[1].onerror?.(new Event('error'));

		expect(boot.fail).toHaveBeenCalledWith('load');
	});

	it('adds nothing when the browser has no import map support', () => {
		const boot = { supported: false, fail: jest.fn() };
		const scripts = runLoader(
			loaderScript(injectBootLoader(html, mapJson)),
			boot,
		);

		expect(scripts).toHaveLength(0);
		expect(boot.fail).toHaveBeenCalledWith('unsupported');
	});

	it('throws when the guard is missing', () => {
		expect(() =>
			injectBootLoader(html.replace(' id="signoz-boot-guard"', ''), mapJson),
		).toThrow('signoz-boot-guard');
	});

	it('throws when Vite did not write an import map', () => {
		expect(() =>
			injectBootLoader(
				html.replace('type="importmap"', 'type="text/plain"'),
				mapJson,
			),
		).toThrow('import map');
	});

	it('throws when there is no module entry script', () => {
		expect(() =>
			injectBootLoader(
				html.replace('type="module"', 'type="text/plain"'),
				mapJson,
			),
		).toThrow('module entry script');
	});
});
