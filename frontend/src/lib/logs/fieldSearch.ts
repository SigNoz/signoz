export const fieldSearchFilter = (
	searchSpace = '',
	currentValue = '',
): boolean => {
	if (!currentValue || !searchSpace) {
		return true;
	}
	return searchSpace.toLowerCase().indexOf(currentValue.toLowerCase()) !== -1;
};
