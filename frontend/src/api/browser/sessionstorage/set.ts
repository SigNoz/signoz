/* eslint-disable no-restricted-globals */
import { getScopedKey } from 'utils/storage';

const set = (key: string, value: string): boolean => {
	try {
		sessionStorage.setItem(getScopedKey(key), value);
		return true;
	} catch (e) {
		return false;
	}
};

export default set;
