const remove = (key: string): void => {
	window.localStorage.removeItem(key);
};

export default remove;
