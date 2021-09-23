const convertToNanoSecondsToSecond = (number: number): string => {
	return parseFloat((number / 1000000).toString()).toFixed(2);
};

export default convertToNanoSecondsToSecond;
