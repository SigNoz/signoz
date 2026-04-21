/* eslint-disable no-restricted-globals */
import { getScopedKey } from 'utils/storage';

const remove = (key: string): boolean => {
	try {
		localStorage.removeItem(getScopedKey(key));
		return true;
	} catch (e) {
		return false;
	}
};

export default remove;
