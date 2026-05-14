export function combineInitialAndUserExpression(
	initial: string,
	user: string,
): string {
	const i = initial.trim();
	const u = user.trim();
	if (!i) {
		return u;
	}
	if (!u) {
		return i;
	}
	return `${i} AND (${u})`;
}

export function getUserExpressionFromCombined(
	initial: string,
	combined: string | null | undefined,
): string {
	const i = initial.trim();
	const c = (combined ?? '').trim();
	if (!c) {
		return '';
	}
	if (!i) {
		return c;
	}
	if (c === i) {
		return '';
	}
	const wrappedPrefix = `${i} AND (`;
	if (c.startsWith(wrappedPrefix) && c.endsWith(')')) {
		return c.slice(wrappedPrefix.length, -1);
	}
	const plainPrefix = `${i} AND `;
	if (c.startsWith(plainPrefix)) {
		return c.slice(plainPrefix.length);
	}
	return c;
}
