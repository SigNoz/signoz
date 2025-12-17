export function formatShortcut(shortcut?: string[]): string {
	try {
		if (!shortcut || shortcut.length === 0) return '';

		const combo = shortcut.find((s) => typeof s === 'string' && s.trim()) ?? '';

		return combo
			.split('+')
			.map((key) => {
				const k = key.trim().toLowerCase();
				switch (k) {
					case 'shift':
						return '⇧';
					case 'cmd':
					case 'meta':
						return '⌘';
					case 'alt':
						return '⌥';
					case 'ctrl':
					case 'control':
						return '⌃';
					case 'arrowup':
						return '↑';
					case 'arrowdown':
						return '↓';
					case 'arrowleft':
						return '←';
					case 'arrowright':
						return '→';
					default:
						return k.toUpperCase();
				}
			})
			.filter(Boolean) // remove empty strings
			.join(' ');
	} catch (error) {
		console.error('Error formatting shortcut:', error);
		return '';
	}
}
