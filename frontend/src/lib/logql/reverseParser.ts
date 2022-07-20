// @ts-nocheck

const reverseParser = (parserQueryArr: { type: string; value: any }[] = []) => {
	const queryString = '';
	parserQueryArr.forEach((query) => {
		if (queryString) {
			queryString += ' ';
		}

		if (Array.isArray(query.value)) {
			queryString += `(${query.value.map((val) => "'" + val + "'").join(',')})`;
		} else {
			queryString += query.value;
		}
	});

	console.log(queryString);
	return queryString;
};

export default reverseParser;
