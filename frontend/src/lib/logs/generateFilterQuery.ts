export const generateFilterQuery = ({ fieldKey, fieldValue, type }) => {
	let generatedQueryString = `${fieldKey} ${type} `;
	if (typeof fieldValue === 'number') {
		generatedQueryString += `(${fieldValue})`;
	} else {
		generatedQueryString += `('${fieldValue}')`;
	}

	return generatedQueryString;
};
