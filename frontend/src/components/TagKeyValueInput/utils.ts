// Tags are strictly key:value. Parse a raw input into a normalized `key:value`
// string, or null if it isn't a valid pair (both sides non-empty). The first
// colon separates key from value, so values may themselves contain colons
// (e.g. `url:http://x`).
export function parseKeyValueTag(raw: string): string | null {
	const trimmed = raw.trim();
	const idx = trimmed.indexOf(':');
	if (idx <= 0) {
		return null;
	}
	const key = trimmed.slice(0, idx).trim();
	const value = trimmed.slice(idx + 1).trim();
	if (!key || !value) {
		return null;
	}
	return `${key}:${value}`;
}
