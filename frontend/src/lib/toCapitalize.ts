export const toCapitalize = (str: string): string => {
	if (!str) return '';

	return str[0].toUpperCase() + str.slice(1);
};
