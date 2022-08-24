/* eslint-disable sonarjs/no-duplicate-string */
/* eslint no-useless-escape: 0 */

const logqlQueries = [
	{
		query: "OPERATION in ('bcd','xy\\'z') AND FULLTEXT contains 'helloxyz'", // Query with IN
		splitterQuery: [
			'OPERATION',
			'in',
			"('bcd','xy\\'z')",
			'AND',
			'FULLTEXT',
			'contains',
			"'helloxyz'",
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'OPERATION' },
			{ type: 'QUERY_OPERATOR', value: 'in' },
			{ type: 'QUERY_VALUE', value: ['bcd', "xy\\'z"] },
			{ type: 'CONDITIONAL_OPERATOR', value: 'AND' },
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'contains' },
			{ type: 'QUERY_VALUE', value: "'helloxyz'" },
		],
	},
	{
		query: "OPERATION in ('bcd') and FULLTEXT contains 'helloxyz'", // Query with IN
		splitterQuery: [
			'OPERATION',
			'in',
			"('bcd')",
			'and',
			'FULLTEXT',
			'contains',
			"'helloxyz'",
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'OPERATION' },
			{ type: 'QUERY_OPERATOR', value: 'in' },
			{ type: 'QUERY_VALUE', value: ['bcd'] },
			{ type: 'CONDITIONAL_OPERATOR', value: 'and' },
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'contains' },
			{ type: 'QUERY_VALUE', value: "'helloxyz'" },
		],
	},
	{
		query: "OPERATION in ('bcd','xyz') AND FULLTEXT contains 'helloxyz'", // Query with IN
		splitterQuery: [
			'OPERATION',
			'in',
			"('bcd','xyz')",
			'AND',
			'FULLTEXT',
			'contains',
			"'helloxyz'",
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'OPERATION' },
			{ type: 'QUERY_OPERATOR', value: 'in' },
			{ type: 'QUERY_VALUE', value: ['bcd', 'xyz'] },
			{ type: 'CONDITIONAL_OPERATOR', value: 'AND' },
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'contains' },
			{ type: 'QUERY_VALUE', value: "'helloxyz'" },
		],
	},
	{
		query: "status gte 200 AND FULLTEXT contains 'helloxyz'",
		splitterQuery: [
			'status',
			'gte',
			'200',
			'AND',
			'FULLTEXT',
			'contains',
			"'helloxyz'",
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'status' },
			{ type: 'QUERY_OPERATOR', value: 'gte' },
			{ type: 'QUERY_VALUE', value: '200' },
			{ type: 'CONDITIONAL_OPERATOR', value: 'AND' },
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'contains' },
			{ type: 'QUERY_VALUE', value: "'helloxyz'" },
		],
	},
	{
		query: "service IN ('Hello (\\'World')", // Query with quotes and brackets
		splitterQuery: ['service', 'IN', "('Hello (\\'World')"],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'service' },
			{ type: 'QUERY_OPERATOR', value: 'IN' },
			{ type: 'QUERY_VALUE', value: ["Hello (\\'World"] },
		],
	},
	{
		query: "service IN ('Hello (\\'World') AND FULLTEXT contains 'ola'", // Query with full text as key pair
		splitterQuery: [
			'service',
			'IN',
			"('Hello (\\'World')",
			'AND',
			'FULLTEXT',
			'contains',
			"'ola'",
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'service' },
			{ type: 'QUERY_OPERATOR', value: 'IN' },
			{ type: 'QUERY_VALUE', value: ["Hello (\\'World"] },
			{ type: 'CONDITIONAL_OPERATOR', value: 'AND' },
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'contains' },
			{ type: 'QUERY_VALUE', value: "'ola'" },
		],
	},
	{
		query: 'id lt 100 and id gt 50 and code lte 500 and code gte 400', // Query with numbers
		splitterQuery: [
			'id',
			'lt',
			'100',
			'and',
			'id',
			'gt',
			'50',
			'and',
			'code',
			'lte',
			'500',
			'and',
			'code',
			'gte',
			'400',
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'id' },
			{ type: 'QUERY_OPERATOR', value: 'lt' },
			{ type: 'QUERY_VALUE', value: '100' },
			{ type: 'CONDITIONAL_OPERATOR', value: 'and' },
			{ type: 'QUERY_KEY', value: 'id' },
			{ type: 'QUERY_OPERATOR', value: 'gt' },
			{ type: 'QUERY_VALUE', value: '50' },
			{ type: 'CONDITIONAL_OPERATOR', value: 'and' },
			{ type: 'QUERY_KEY', value: 'code' },
			{ type: 'QUERY_OPERATOR', value: 'lte' },
			{ type: 'QUERY_VALUE', value: '500' },
			{ type: 'CONDITIONAL_OPERATOR', value: 'and' },
			{ type: 'QUERY_KEY', value: 'code' },
			{ type: 'QUERY_OPERATOR', value: 'gte' },
			{ type: 'QUERY_VALUE', value: '400' },
		],
	},
	{
		query: 'FULLTEXT contains \'Hello, "World"\'', // Full text with Quotes
		splitterQuery: ['FULLTEXT', 'contains', `'Hello, "World"'`],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'contains' },
			{ type: 'QUERY_VALUE', value: `'Hello, "World"'` },
		],
	},

	{
		query: "service NIN ('name > 100') AND length gt 100", // Characters inside string
		splitterQuery: [
			'service',
			'NIN',
			"('name > 100')",
			'AND',
			'length',
			'gt',
			'100',
		],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'service' },
			{ type: 'QUERY_OPERATOR', value: 'NIN' },
			{ type: 'QUERY_VALUE', value: ['name > 100'] },
			{ type: 'CONDITIONAL_OPERATOR', value: 'AND' },
			{ type: 'QUERY_KEY', value: 'length' },
			{ type: 'QUERY_OPERATOR', value: 'gt' },
			{ type: 'QUERY_VALUE', value: '100' },
		],
	},

	// Template
	{
		query: '',
		splitterQuery: [],
		parsedQuery: [],
	},
];

const specialLogQLQueries = [
	{
		query: 'key IN 22', // Fulltext
		splitterQuery: ['key', 'IN', '22'],
		parsedQuery: [
			{ type: 'QUERY_KEY', value: 'FULLTEXT' },
			{ type: 'QUERY_OPERATOR', value: 'CONTAINS' },
			{ type: 'QUERY_VALUE', value: 'key IN 22' },
		],
		reverseParsed: "FULLTEXT CONTAINS 'key IN 22'",
	},
];

export { logqlQueries, specialLogQLQueries };
