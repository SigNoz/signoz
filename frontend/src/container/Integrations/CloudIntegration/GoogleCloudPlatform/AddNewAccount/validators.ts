/** Whether the connection-secret field expects a URL or a free-form secret. */
export type SecretFieldType = 'url' | 'text';

/** Protocols accepted for URL fields. */
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'];

/** A parseable URL using an allowed protocol (http, https, ftp) is valid. */
export function isValidUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);
		return ALLOWED_URL_PROTOCOLS.includes(protocol);
	} catch {
		return false;
	}
}

/**
 * Validates a single editable connection-secret field.
 * All fields are required (non-empty); `url` fields must additionally be a
 * valid http(s) URL. Returns `true` when valid, else the error message.
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
