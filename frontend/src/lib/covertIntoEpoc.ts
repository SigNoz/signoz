const convertIntoEpoc = (number: number): string =>
	number.toString().split('.').join('').toString();

export default convertIntoEpoc;
