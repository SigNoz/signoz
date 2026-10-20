import type { Monaco } from '@monaco-editor/react';

export const JSON_EDITOR_THEME = 'signoz-json';

function token(el: HTMLElement, name: string): string {
	return getComputedStyle(el).getPropertyValue(name).trim().replace('#', '');
}

function isDark(hex: string): boolean {
	if (hex.length < 6) {
		return true;
	}
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

export function defineJsonEditorTheme(monaco: Monaco, el: HTMLElement): void {
	const background = token(el, '--l1-background');
	const foreground = token(el, '--l1-foreground');
	const keyColor = token(el, '--bg-vanilla-400');
	const valueColor = token(el, '--bg-robin-400');

	const rules: { token: string; foreground: string }[] = [];
	if (keyColor) {
		rules.push({ token: 'string.key.json', foreground: keyColor });
	}
	if (valueColor) {
		rules.push({ token: 'string.value.json', foreground: valueColor });
	}

	const colors: Record<string, string> = {};
	if (background) {
		colors['editor.background'] = `#${background}`;
	}
	if (foreground) {
		colors['editor.foreground'] = `#${foreground}`;
	}

	monaco.editor.defineTheme(JSON_EDITOR_THEME, {
		base: isDark(background) ? 'vs-dark' : 'vs',
		inherit: true,
		rules,
		colors,
	});
}
