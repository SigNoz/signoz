/* eslint-disable  */
// @ts-ignore
// @ts-nocheck

export const reverseParser = (
	parserQueryArr: { type: string; value: any }[] = [],
) => {
	let queryString = '';
	parserQueryArr.forEach((query) => {
		if (queryString) {
			queryString += ' ';
		}

		if (Array.isArray(query.value) && query.value.length > 0) {
			queryString += `(${query.value.map((val) => `'${val}'`).join(',')})`;
		} else {
			queryString += query.value;
		}
	});

	// console.log(queryString);
	return queryString;
};

export default reverseParser;
