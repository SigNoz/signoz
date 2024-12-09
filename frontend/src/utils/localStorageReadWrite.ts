export const updateLocalStorage = (key: string, value: any): void => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error(`Failed to update ${key} in localStorage`, error);
	}
};

export const getFromLocalStorage = (key: string): any => {
	try {
		const item = localStorage.getItem(key);
		return item ? JSON.parse(item) : null;
	} catch (error) {
		console.error(`Failed to retrieve ${key} from localStorage`, error);
		return null;
	}
};
