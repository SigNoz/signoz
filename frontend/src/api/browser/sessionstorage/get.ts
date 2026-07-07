/* oxlint-disable no-restricted-globals */
import { getBasePath } from 'utils/basePath';
import { getScopedKey } from 'utils/storage';

const get = (key: string): string | null => {
	try {
		const scopedKey = getScopedKey(key);
		const value = sessionStorage.getItem(scopedKey);

		// Lazy migration: same pattern as localStorage — promote bare keys written
		// by a previous root deployment to the scoped key on first read.
		if (value === null && getBasePath() !== '/') {
			const bare = sessionStorage.getItem(key);
			if (bare !== null) {
				sessionStorage.setItem(scopedKey, bare);
				sessionStorage.removeItem(key);
				return bare;
			}
		}

		return value;
	} catch {
		return '';
	}
};

export default get;
