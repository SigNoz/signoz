const convertDateToAmAndPm = (date: Date): string => {
	return date.toLocaleString('en-US', {
		hour: 'numeric',
		minute: 'numeric',
		hour12: true,
	});
};

export default convertDateToAmAndPm;
