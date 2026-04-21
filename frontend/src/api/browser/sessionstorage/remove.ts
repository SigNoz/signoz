/* eslint-disable no-restricted-globals */
import { getScopedKey } from 'utils/storage';

const remove = (key: string): boolean => {
	try {
		sessionStorage.removeItem(getScopedKey(key));
		return true;
	} catch (e) {
		return false;
	}
};

export default remove;
