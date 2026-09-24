import { Monaco } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';

type EditorOptions = Parameters<Monaco['editor']['create']>[1];

export const JSON_THEME_DARK = 'json-theme-dark';

export function defineJsonTheme(monaco: Monaco): void {
	monaco.editor.defineTheme(JSON_THEME_DARK, {
		base: 'vs-dark',
		inherit: true,
		rules: [
			{ token: 'string.key.json', foreground: Color.BG_VANILLA_400 },
			{ token: 'string.value.json', foreground: Color.BG_ROBIN_400 },
		],
		colors: {
			'editor.background': Color.BG_INK_400,
		},
	});
}

const BASE_EDITOR_OPTIONS: EditorOptions = {
	automaticLayout: true,
	wordWrap: 'on',
	minimap: { enabled: false },
	fontFamily: 'Geist Mono',
	fontSize: 13,
	lineHeight: 20,
	scrollBeyondLastLine: false,
	folding: true,
	tabSize: 2,
};

export const READONLY_EDITOR_OPTIONS: EditorOptions = {
	...BASE_EDITOR_OPTIONS,
	readOnly: true,
	domReadOnly: true,
};

export const EDITABLE_EDITOR_OPTIONS: EditorOptions = {
	...BASE_EDITOR_OPTIONS,
	fixedOverflowWidgets: true,
};
