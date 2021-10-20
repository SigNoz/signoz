const get = (key: string): string | null => {
	return localStorage.getItem(key);
};

export default get;
