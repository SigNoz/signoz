const query = 'OPERATION in ("bcd") AND FULLTEXT contains "helloxyz"'; // valid
// const query = 'OPERATION in ("bcd") AND "abcd" FULLTEXT contains "helloxyz"' // invalid
// const query = "helloxyz"; // valid
// const query = 'OPERATION in ("bcd") AND "helloxyz"' // invalid
// const query = 'status gte 200 AND FULLTEXT contains "helloxyz"' // valid

// const query = 'service IN ("Hello \(\"World\"")' // valid

const RULES = {
	// Modify
	insertConditionalOperatorBetweenQueries() {
		// TODO
	},
	mergeAdjacentFreeText(queries) {
		// TODO
	},

	// Sanitize
};

const ConditionalOperators = {
	AND: 'AND',
	OR: 'OR',
};

const QueryTypes = {
	QUERY_KEY: 'QUERY_KEY',
	QUERY_OPERATOR: 'QUERY_OPERATOR',
	QUERY_VALUE: 'QUERY_VALUE',
	CONDITIONAL_OPERATOR: 'CONDITIONAL_OPERATOR',
};

const QueryOperators = {
	IN: 'IN',
	NIN: 'NIN',
	GTE: 'GTE',
	GT: 'GT',
	LTE: 'LTE',
	LT: 'LT',
	CONTAINS: 'CONTAINS',
};

const splitter = (queryString) => {
	debugger;
	const splittedParts = [];
	let start = 0;
	let isBracketStart = false;
	let isQuoteStart = false;

	const pushPart = (idx) => {
		splittedParts.push(queryString.slice(start, idx));
		start = null;
	};
	for (let idx = 0; idx < queryString.length; idx += 1) {
		debugger;
		const currentChar = queryString[idx];
		// console.log(currentChar, idx)

		if (start === null) {
			start = idx;
		}
		if (currentChar === ' ') {
			if (!isBracketStart && !isQuoteStart) {
				pushPart(idx);
			}
		} else if (currentChar === '(') {
			isBracketStart = true;
		} else if (currentChar === ')') {
			console.log(isQuoteStart, isBracketStart);
			if (queryString[idx - 1] !== '\\') {
				pushPart(idx + 1);
				isBracketStart = false;
			}
			if (isQuoteStart) {
				isQuoteStart = false;
			}
		} else if (currentChar === '"') {
			if (isQuoteStart) {
				if (queryString[idx - 1] !== '\\' && !isBracketStart) {
					pushPart(idx + 1);
					isQuoteStart = false;
				}
			} else {
				isQuoteStart = true;
			}
		}
	}

	console.log(splittedParts.filter(Boolean));
	return splittedParts.filter(Boolean);
};

const parsedRaw = [];
const generateQuery = (query) => {
	const prevToken = parsedRaw[parsedRaw.length - 1];

	// Is a QUERY_KEY
	if (
		prevToken === undefined ||
		prevToken.type === QueryTypes.CONDITIONAL_OPERATOR
	) {
		parsedRaw.push({
			type: QueryTypes.QUERY_KEY,
			value: query,
		});
	}
	// Is a QUERY_OPERATOR
	else if (prevToken && prevToken.type === QueryTypes.QUERY_KEY) {
		if (
			Object.values(QueryOperators).find(
				(op) => op.toLowerCase() === query.toLowerCase(),
			)
		)
			parsedRaw.push({
				type: QueryTypes.QUERY_OPERATOR,
				value: query.toUpperCase(),
			});
		else {
			throw new Error('Expected conditional operator received', query);
		}
	}
	// Is a QUERY_VALUE
	else if (prevToken && prevToken.type === QueryTypes.QUERY_OPERATOR) {
		parsedRaw.push({
			type: QueryTypes.QUERY_VALUE,
			value: query,
		});
	} else if (prevToken && prevToken.type === QueryTypes.QUERY_VALUE) {
		if (
			Object.values(ConditionalOperators).find(
				(op) => op.toLowerCase() === query.toLowerCase(),
			)
		)
			parsedRaw.push({
				type: QueryTypes.CONDITIONAL_OPERATOR,
				value: query,
			});
		else {
			throw new Error('Expected conditional operator received', query);
		}
	} else {
		// Not a Key
	}
};
const parseQuery = (query) => {
	const spaceSplittedQUery = splitter(query);
	spaceSplittedQUery.forEach((q) => {
		generateQuery(q);
	});
	console.log(parsedRaw);
};

// parseQuery(query)
// splitter(query)

const parsedOutput = [
	{ type: 'QUERY_KEY', value: 'OPERATION' },
	{ type: 'QUERY_OPERATOR', value: 'IN' },
	{ type: 'QUERY_VALUE', value: '("bcd")' },
	{ type: 'CONDITIONAL_OPERATOR', value: 'AND' },
	{ type: 'QUERY_KEY', value: 'FULLTEXT' },
	{ type: 'QUERY_OPERATOR', value: 'CONTAINS' },
	{ type: 'QUERY_VALUE', value: '"helloxyz"' },
];

const reverseParse = (parsedQueryData = []) => {
	let parsedQueryString = '';
	parsedQueryData.forEach((query) => {
		if (parsedQueryString) {
			parsedQueryString += ' ';
		}
		// TODO Typebased
		parsedQueryString += query.value;
	});

	return parsedQueryString;
};

console.log(reverseParse(parsedOutput));
