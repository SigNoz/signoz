import type { Monaco } from '@monaco-editor/react';

type EditorThemeModule = typeof import('../editorTheme');

const DARK_TOKENS = {
	'--l1-background': '#0b0c0e',
	'--l1-foreground': '#eceef2',
	'--bg-vanilla-400': '#c0c1c3',
	'--bg-robin-400': '#7190f9',
};

const LIGHT_TOKENS = {
	'--l1-background': '#ffffff',
	'--l1-foreground': '#121317',
	'--bg-vanilla-400': '#c0c1c3',
	'--bg-robin-400': '#7190f9',
};

function setTokens(tokens: Record<string, string>): void {
	Object.entries(tokens).forEach(([name, value]) => {
		document.body.style.setProperty(name, value);
	});
}

function createMonaco(): { monaco: Monaco; defineTheme: jest.Mock } {
	const defineTheme = jest.fn();
	return {
		monaco: { editor: { defineTheme } } as unknown as Monaco,
		defineTheme,
	};
}

function loadModule(): EditorThemeModule {
	let mod: EditorThemeModule | undefined;
	jest.isolateModules(() => {
		mod = jest.requireActual<EditorThemeModule>('../editorTheme');
	});
	return mod as EditorThemeModule;
}

async function flushMutations(): Promise<void> {
	await Promise.resolve();
}

describe('registerEditorTheme', () => {
	afterEach(() => {
		document.body.removeAttribute('style');
		document.body.className = '';
	});

	it('defines a dark theme with the JSON token colours on a dark surface', () => {
		setTokens(DARK_TOKENS);
		const { registerEditorTheme, EDITOR_THEME } = loadModule();
		const { monaco, defineTheme } = createMonaco();

		registerEditorTheme(monaco);

		expect(defineTheme).toHaveBeenCalledTimes(1);
		expect(defineTheme).toHaveBeenCalledWith(EDITOR_THEME, {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'string.key.json', foreground: 'c0c1c3' },
				{ token: 'string.value.json', foreground: '7190f9' },
			],
			colors: {
				'editor.background': '#0b0c0e',
				'editor.foreground': '#eceef2',
			},
		});
	});

	it('keeps the vs palette on a light surface', () => {
		setTokens(LIGHT_TOKENS);
		const { registerEditorTheme } = loadModule();
		const { monaco, defineTheme } = createMonaco();

		registerEditorTheme(monaco);

		expect(defineTheme).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				base: 'vs',
				rules: [],
				colors: {
					'editor.background': '#ffffff',
					'editor.foreground': '#121317',
				},
			}),
		);
	});

	it('redefines the theme when the body class switches the tokens', async () => {
		setTokens(DARK_TOKENS);
		const { registerEditorTheme } = loadModule();
		const { monaco, defineTheme } = createMonaco();
		registerEditorTheme(monaco);

		setTokens(LIGHT_TOKENS);
		document.body.classList.add('lightMode');
		await flushMutations();

		expect(defineTheme).toHaveBeenCalledTimes(2);
		expect(defineTheme).toHaveBeenLastCalledWith(
			expect.any(String),
			expect.objectContaining({ base: 'vs' }),
		);
	});

	it('ignores body class changes that leave the tokens alone', async () => {
		setTokens(DARK_TOKENS);
		const { registerEditorTheme } = loadModule();
		const { monaco, defineTheme } = createMonaco();
		registerEditorTheme(monaco);

		document.body.classList.add('ant-scrolling-effect');
		await flushMutations();

		expect(defineTheme).toHaveBeenCalledTimes(1);
	});

	it('watches the body once however many editors mount', async () => {
		const observe = jest.spyOn(MutationObserver.prototype, 'observe');
		setTokens(DARK_TOKENS);
		const { registerEditorTheme } = loadModule();
		const { monaco, defineTheme } = createMonaco();
		registerEditorTheme(monaco);
		registerEditorTheme(monaco);

		setTokens(LIGHT_TOKENS);
		document.body.classList.add('lightMode');
		await flushMutations();

		expect(observe).toHaveBeenCalledTimes(1);
		expect(defineTheme).toHaveBeenCalledTimes(2);
		observe.mockRestore();
	});
});
