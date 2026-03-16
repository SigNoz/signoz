/**
 * Masks a key string, showing only the first 2 and last 2 characters.
 */
export function getMaskedKey(key: string): string {
	if (!key || key.length < 4) {
		return key || 'N/A';
	}
	return `${key.substring(0, 2)}·······${key.slice(-2).trim()}`;
}
