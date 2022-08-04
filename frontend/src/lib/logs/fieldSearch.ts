export const fieldSearchFilter = (searchSpace = '', currentValue = '') => {
	if (!currentValue || !searchSpace) {
		return true;
	}
	return searchSpace.toLowerCase().indexOf(currentValue.toLowerCase()) !== -1;
};
