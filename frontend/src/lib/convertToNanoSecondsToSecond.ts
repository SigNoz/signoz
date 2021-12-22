const convertToNanoSecondsToSecond = (number: number): number => {
	return parseFloat((number / 1000000).toString());
};

export default convertToNanoSecondsToSecond;
