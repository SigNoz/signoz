export const toFixed = (input: number, fixedCount: number) => {
	if (input.toString().split('.').length > 1) {
		return input.toFixed(fixedCount);
	}
	return input;
};
