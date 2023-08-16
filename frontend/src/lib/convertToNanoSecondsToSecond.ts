const convertToNanoSecondsToSecond = (number: number): string =>
	parseFloat((number / 1000000).toString()).toFixed(2);

export default convertToNanoSecondsToSecond;
