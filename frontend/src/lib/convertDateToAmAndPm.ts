const convertDateToAmAndPm = (date: Date): string =>
	date.toLocaleString('en-US', {
		hour: '2-digit',
		minute: 'numeric',
		second: 'numeric',
		hour12: true,
	});

export default convertDateToAmAndPm;
