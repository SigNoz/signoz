import { getQueryRangeRequestData } from '../utils';

describe('getQueryRangeRequestData', () => {
	it('keeps sending the card step on the services list queries', () => {
		const [request] = getQueryRangeRequestData({
			topLevelOperations: [['frontend', ['GET /']]],
			globalSelectedInterval: '15m',
		});

		const steps = request.query.builder.queryData.map(
			(query) => query.stepInterval,
		);

		expect(steps).toStrictEqual(Array(steps.length).fill(60));
	});
});
