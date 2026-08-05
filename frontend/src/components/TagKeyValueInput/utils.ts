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

const TAG_KEY_REGEX = new RegExp('^[a-zA-Z$_@{#][a-zA-Z0-9$_@#{}:/-]*$');
const TAG_VALUE_REGEX = new RegExp('^[a-zA-Z0-9$_@#{}:.+=/-]*$');
const MAX_TAG_LEN = 32;

export type TagValidation = { tag: string } | { error: string };

export function validateTag(
	raw: string,
	existingTags: string[],
	excludeIndex = -1,
): TagValidation {
	const normalized = parseKeyValueTag(raw);
	if (!normalized) {
		return { error: 'Tags must be in key:value format (both sides required).' };
	}
	const separator = normalized.indexOf(':');
	const key = normalized.slice(0, separator);
	const value = normalized.slice(separator + 1);
	if (!TAG_KEY_REGEX.test(key)) {
		return { error: 'Tag keys cannot contain spaces or special characters.' };
	}
	if (!TAG_VALUE_REGEX.test(value)) {
		return { error: 'Tag values cannot contain spaces or special characters.' };
	}
	if (key.length > MAX_TAG_LEN || value.length > MAX_TAG_LEN) {
		return {
			error: `Tag key and value must each be ${MAX_TAG_LEN} characters or fewer.`,
		};
	}
	if (
		existingTags.some(
			(tag, index) => tag === normalized && index !== excludeIndex,
		)
	) {
		return { error: 'This tag already exists.' };
	}
	return { tag: normalized };
}
