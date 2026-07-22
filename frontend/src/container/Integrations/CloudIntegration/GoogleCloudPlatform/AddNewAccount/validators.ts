export type SecretFieldType = 'url' | 'text';

export function isValidUrl(value: string): boolean {
	try {
		return Boolean(new URL(value));
	} catch {
		return false;
	}
}

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
