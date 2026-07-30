//TODO: This is a local theme for now, but ideally for the editor as well. Just like prettyViewer, we have a theme. We should have a theme for the editor as well.
import { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';

export const SIGNOZ_JSON_THEME_DARK = 'signoz-attr-mapping-json-dark';
export const SIGNOZ_JSON_THEME_LIGHT = 'signoz-attr-mapping-json-light';

const SHARED_THEME = {
	inherit: true,
	colors: {
		'editor.background': '#00000000', // transparent — inherit the panel bg
	},
	fontFamily: 'SF Mono, Geist Mono, Fira Code, monospace',
	fontSize: 12,
	fontWeight: 'normal',
	lineHeight: 18,
	letterSpacing: -0.06,
};

export function defineSignozJsonTheme(monaco: Monaco): void {
	monaco.editor.defineTheme(SIGNOZ_JSON_THEME_DARK, {
		...SHARED_THEME,
		base: 'vs-dark',
		rules: [
			{ token: 'string.key.json', foreground: Color.BG_ROBIN_400 },
			{ token: 'string.value.json', foreground: Color.BG_VANILLA_400 },
		],
	});

	monaco.editor.defineTheme(SIGNOZ_JSON_THEME_LIGHT, {
		...SHARED_THEME,
		base: 'vs',
		rules: [
			{ token: 'string.key.json', foreground: Color.BG_ROBIN_500 },
			{ token: 'string.value.json', foreground: Color.BG_INK_400 },
		],
	});
}
