const remove = (key: string): boolean => {
	try {
		window.localStorage.removeItem(key);
		return true;
	} catch (e) {
		return false;
	}
};

export default remove;
