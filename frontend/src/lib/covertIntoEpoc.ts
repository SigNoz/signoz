const convertIntoEpoc = (number: number): string => {
	return number.toString().split('.').join('').toString();
};

export default convertIntoEpoc;
