const set = (key: string, value: string): boolean => {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch (e) {
		return false;
	}
};

export default set;
