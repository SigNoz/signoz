export const MOCK_USE_QUERIES_DATA = [
	{
		isLoading: false,
		isError: false,
		error: null,
		data: {
			statusCode: 200,
			payload: [
				{
					exceptionType: '*errors.errorString',
					exceptionMessage: 'redis timeout',
					exceptionCount: 2510,
					lastSeen: '2025-04-14T18:27:57.797616374Z',
					firstSeen: '2025-04-14T17:58:00.262775497Z',
					serviceName: 'redis-manual',
					groupID: '511b9c91a92b9c5166ecb77235f5743b',
				},
			],
		},
	},
	{
		status: 'success',
		isLoading: false,
		isSuccess: true,
		isError: false,
		isIdle: false,
		data: {
			statusCode: 200,
			error: null,
			payload: 525,
		},
		dataUpdatedAt: 1744661020341,
		error: null,
		errorUpdatedAt: 0,
		failureCount: 0,
		errorUpdateCount: 0,
		isFetched: true,
		isFetchedAfterMount: true,
		isFetching: false,
		isRefetching: false,
		isLoadingError: false,
		isPlaceholderData: false,
		isPreviousData: false,
		isRefetchError: false,
		isStale: true,
	},
];

export const INIT_URL_WITH_COMMON_QUERY =
	'/exceptions?compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522dataSource%2522%253A%2522traces%2522%252C%2522queryName%2522%253A%2522A%2522%252C%2522aggregateOperator%2522%253A%2522noop%2522%252C%2522aggregateAttribute%2522%253A%257B%2522id%2522%253A%2522----resource--false%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522key%2522%253A%2522%2522%252C%2522isColumn%2522%253Afalse%252C%2522type%2522%253A%2522resource%2522%252C%2522isJSON%2522%253Afalse%257D%252C%2522timeAggregation%2522%253A%2522rate%2522%252C%2522spaceAggregation%2522%253A%2522sum%2522%252C%2522functions%2522%253A%255B%255D%252C%2522filters%2522%253A%257B%2522items%2522%253A%255B%257B%2522id%2522%253A%2522db118ac7-9313-4adb-963f-f31b5b32c496%2522%252C%2522op%2522%253A%2522in%2522%252C%2522key%2522%253A%257B%2522key%2522%253A%2522deployment.environment%2522%252C%2522dataType%2522%253A%2522string%2522%252C%2522type%2522%253A%2522resource%2522%252C%2522isColumn%2522%253Afalse%252C%2522isJSON%2522%253Afalse%257D%252C%2522value%2522%253A%2522mq-kafka%2522%257D%255D%252C%2522op%2522%253A%2522AND%2522%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522stepInterval%2522%253A60%252C%2522having%2522%253A%255B%255D%252C%2522limit%2522%253Anull%252C%2522orderBy%2522%253A%255B%255D%252C%2522groupBy%2522%253A%255B%255D%252C%2522legend%2522%253A%2522%2522%252C%2522reduceTo%2522%253A%2522avg%2522%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%252C%2522promql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522query%2522%253A%2522%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%257D%255D%252C%2522clickhouse_sql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%252C%2522query%2522%253A%2522%2522%257D%255D%252C%2522id%2522%253A%2522dd576d04-0822-476d-b0c2-807a7af2e5e7%2522%257D';

export const extractCompositeQueryObject = (
	url: string,
): Record<string, unknown> | null => {
	try {
		const urlObj = new URL(`http://dummy-base${url}`); // Add dummy base to parse relative URL
		const encodedParam = urlObj.searchParams.get('compositeQuery');

		if (!encodedParam) return null;

		// Decode twice
		const firstDecode = decodeURIComponent(encodedParam);
		const secondDecode = decodeURIComponent(firstDecode);

		// Parse JSON
		return JSON.parse(secondDecode);
	} catch (err) {
		console.error('Failed to extract compositeQuery:', err);
		return null;
	}
};

export const TAG_FROM_QUERY = [
	{
		BoolValues: [],
		Key: 'deployment.environment',
		NumberValues: [],
		Operator: 'In',
		StringValues: ['mq-kafka'],
		TagType: 'ResourceAttribute',
	},
];

export const MOCK_ERROR_LIST = [
	{
		exceptionType: '*errors.errorString',
		exceptionMessage: 'redis timeout',
		exceptionCount: 2510,
		lastSeen: '2025-04-14T18:27:57.797616374Z',
		firstSeen: '2025-04-14T17:58:00.262775497Z',
		serviceName: 'redis-manual',
		groupID: '511b9c91a92b9c5166ecb77235f5743b',
	},
];
