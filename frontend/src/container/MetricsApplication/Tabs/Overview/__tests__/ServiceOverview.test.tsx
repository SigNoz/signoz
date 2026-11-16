import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import Graph from 'container/WidgetCard/Card';
import { mockAppParams } from 'tests/router-mocks';
import { render } from 'tests/test-utils';

import ServiceOverview from '../ServiceOverview';

jest.mock('container/WidgetCard/Card', () => ({
	__esModule: true,
	default: jest.fn(() => null),
}));

jest.mock('hooks/useResourceAttribute', () => ({
	...jest.requireActual('hooks/useResourceAttribute'),
	__esModule: true,
	default: (): unknown => ({
		queries: [
			{
				id: 'env',
				tagKey: 'resource_deployment.environment',
				operator: 'Not IN',
				tagValue: ['prod'],
			},
		],
	}),
}));

mockAppParams({ servicename: 'frontend' });

describe('ServiceOverview', () => {
	it('filters the traces latency on the resource attribute with its operator', () => {
		render(
			<ServiceOverview
				stepInterval={60}
				selectedTimeStamp={0}
				selectedTraceTags="[]"
				onDragSelect={jest.fn()}
				handleGraphClick={jest.fn()}
				topLevelOperationsRoute={['GET /']}
				topLevelOperationsIsLoading={false}
			/>,
		);

		const { widget } = jest.mocked(Graph).mock.calls[0][0];
		const [latencyQuery] = prepareQueryRangePayloadV5({
			query: widget.query,
			graphType: widget.panelTypes,
			selectedTime: 'GLOBAL_TIME',
		}).queryPayload.compositeQuery.queries;

		expect(latencyQuery.spec).toMatchObject({
			filter: {
				expression:
					"service.name = 'frontend' AND name in ['GET /'] AND deployment.environment NOT IN ['prod']",
			},
		});
	});
});
