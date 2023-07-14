import { generateFilterQuery } from './logs/generateFilterQuery';

export const getGeneratedFilterQueryString = (
	fieldKey: string,
	fieldValue: string,
	operator: string,
	queryString: string,
): string => {
	let updatedQueryString = queryString || '';

	const generatedString = generateFilterQuery({
		fieldKey,
		fieldValue,
		type: operator,
	});

	if (updatedQueryString.length === 0) {
		updatedQueryString += `${generatedString}`;
	} else {
		updatedQueryString += ` AND ${generatedString}`;
	}

	return updatedQueryString;
};
