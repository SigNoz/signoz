export function formatShortcut(shortcut?: string[]): string {
	if (!shortcut || shortcut.length === 0) return '';

	const combo = shortcut[0];

	return combo
		.split('+')
		.map((key) => {
			const k = key.trim().toLowerCase();
			if (k === 'shift') return '⇧';
			if (k === 'cmd' || k === 'meta') return '⌘';
			if (k === 'alt') return '⌥';
			if (k === 'ctrl' || k === 'control') return '⌃';
			return k.toUpperCase();
		})
		.join(' ');
}
