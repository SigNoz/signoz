const getGridColor = (isDarkMode: boolean): string => {
	if (isDarkMode) {
		return 'rgba(231,233,237,0.3)';
	}
	return 'rgba(0,0,0,0.5)';
};

export default getGridColor;
