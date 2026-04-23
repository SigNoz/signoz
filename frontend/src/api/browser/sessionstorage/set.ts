/* oxlint-disable no-restricted-globals */
import { getScopedKey } from 'utils/storage';

const set = (key: string, value: string): boolean => {
	try {
		sessionStorage.setItem(getScopedKey(key), value);
		return true;
	} catch {
		return false;
	}
};

export default set;
