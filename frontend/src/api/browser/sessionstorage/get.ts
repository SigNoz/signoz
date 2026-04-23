/* oxlint-disable no-restricted-globals */
import { getScopedKey } from 'utils/storage';

const get = (key: string): string | null => {
	try {
		return sessionStorage.getItem(getScopedKey(key));
	} catch {
		return '';
	}
};

export default get;
