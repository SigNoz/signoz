const get = (key: string): string | null => {
	try {
		return localStorage.getItem(key);
	} catch (e) {
		return '';
	}
};

export default get;
