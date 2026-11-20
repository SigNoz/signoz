import { getQueryRangeRequestData } from '../utils';

describe('getQueryRangeRequestData', () => {
	it('leaves the step of the services list queries to v5', () => {
		const [request] = getQueryRangeRequestData({
			topLevelOperations: [['frontend', ['GET /']]],
			globalSelectedInterval: '15m',
		});

		const steps = request.query.builder.queryData.map(
			(query) => query.stepInterval,
		);

		expect(steps).toStrictEqual(Array(steps.length).fill(null));
	});
});
