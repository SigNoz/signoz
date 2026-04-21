/* eslint-disable no-restricted-globals */
import { getScopedKey } from 'utils/storage';

const get = (key: string): string | null => {
	try {
		return localStorage.getItem(getScopedKey(key));
	} catch (e) {
		return '';
	}
};

export default get;
