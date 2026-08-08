/** Whether the connection-secret field expects a URL or a free-form secret. */
export type SecretFieldType = 'url' | 'text';

/** Basic check: a value the URL constructor can parse is treated as a valid URL. */
export function isValidUrl(value: string): boolean {
	try {
		return Boolean(new URL(value));
	} catch {
		return false;
	}
}

/**
 * Validates a single editable connection-secret field.
 * All fields are required (non-empty); `url` fields must additionally parse as a URL.
 * Returns `true` when valid, else the error message.
 */
export function validateSecretValue(
	label: string,
	type: SecretFieldType,
	value: string | undefined,
): true | string {
	const trimmed = value?.trim();
	if (!trimmed) {
		return `Please enter the ${label}`;
	}
	if (type === 'url' && !isValidUrl(trimmed)) {
		return `Please enter a valid URL for ${label}`;
	}
	return true;
}
