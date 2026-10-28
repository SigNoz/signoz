import type { Monaco } from '@monaco-editor/react';

export const EDITOR_THEME = 'signoz';

let definedBackground: string | undefined;
let bodyClassObserver: MutationObserver | undefined;

function token(name: string): string {
	return getComputedStyle(document.body)
		.getPropertyValue(name)
		.trim()
		.replace('#', '');
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

function defineEditorTheme(monaco: Monaco): void {
	const background = token('--l1-background');
	if (background === definedBackground) {
		return;
	}
	definedBackground = background;

	const foreground = token('--l1-foreground');
	const keyColor = token('--bg-vanilla-400');
	const valueColor = token('--bg-robin-400');

	// Both token colours are picked to read on a dark surface, so on a light one
	// they wash out, the keys worst of all. Monaco's own `vs` palette is built
	// for that surface, so let it keep its colours there, as the role viewer does.
	const rules: { token: string; foreground: string }[] = [];
	if (isDark(background)) {
		if (keyColor) {
			rules.push({ token: 'string.key.json', foreground: keyColor });
		}
		if (valueColor) {
			rules.push({ token: 'string.value.json', foreground: valueColor });
		}
	}

	const colors: Record<string, string> = {};
	if (background) {
		colors['editor.background'] = `#${background}`;
	}
	if (foreground) {
		colors['editor.foreground'] = `#${foreground}`;
	}

	monaco.editor.defineTheme(EDITOR_THEME, {
		base: isDark(background) ? 'vs-dark' : 'vs',
		inherit: true,
		rules,
		colors,
	});
}

// Monaco has a single theme for every editor on the page, and the design tokens
// switch with the body's `dark` class, so the theme follows that class instead
// of being defined per editor.
export function registerEditorTheme(monaco: Monaco): void {
	defineEditorTheme(monaco);
	if (bodyClassObserver) {
		return;
	}
	bodyClassObserver = new MutationObserver(() => defineEditorTheme(monaco));
	bodyClassObserver.observe(document.body, {
		attributes: true,
		attributeFilter: ['class'],
	});
}
