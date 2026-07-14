/* oxlint-disable no-restricted-globals */
import { getBasePath } from 'utils/basePath';
import { getScopedKey } from 'utils/storage';

const get = (key: string): string | null => {
	try {
		const scopedKey = getScopedKey(key);
		const value = localStorage.getItem(scopedKey);

		// Lazy migration: if running under a URL prefix and the scoped key doesn't
		// exist yet, fall back to the bare key (written by a previous root deployment).
		// Promote it to the scoped key and remove the bare key so future reads are fast.
		if (value === null && getBasePath() !== '/') {
			const bare = localStorage.getItem(key);
			if (bare !== null) {
				localStorage.setItem(scopedKey, bare);
				localStorage.removeItem(key);
				return bare;
			}
		}

		return value;
	} catch {
		return '';
	}
};

export default get;
