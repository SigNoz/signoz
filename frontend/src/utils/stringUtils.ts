export function unquote(str: string): string {
	if (typeof str !== 'string') return str;

	const trimmed = str.trim();
	const firstChar = trimmed[0];
	const lastChar = trimmed[trimmed.length - 1];

	if ((firstChar === '"' || firstChar === "'") && firstChar === lastChar) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}

export function isQuoted(str: string): boolean {
	const trimmed = str.trim();
	return trimmed.length >= 2 && /^(["'`])(.*)\1$/.test(trimmed);
}
