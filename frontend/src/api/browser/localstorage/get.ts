const get = (key: string): string | null => {
	try {
		const value = localStorage.getItem(key);
		return value;
	} catch (e) {
		return '';
	}
};

export default get;
