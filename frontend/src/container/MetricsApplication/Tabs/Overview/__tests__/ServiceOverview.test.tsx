import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import Graph from 'container/WidgetCard/Card';
import { IResourceAttribute } from 'hooks/useResourceAttribute/types';
import { encode } from 'js-base64';
import { defaultFeatureFlags, render } from 'tests/test-utils';

import ServiceOverview from '../ServiceOverview';

jest.mock('container/WidgetCard/Card', () => ({
	__esModule: true,
	default: jest.fn(() => null),
}));

const resourceAttributes: IResourceAttribute[] = [
	{
		id: 'env',
		tagKey: 'resource_deployment.environment',
		operator: 'Not IN',
		tagValue: ['prod'],
	},
];

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
			undefined,
			{
				initialRoute: `/services/frontend?${QueryParams.resourceAttributes}=${encodeURIComponent(
					encode(JSON.stringify(resourceAttributes)),
				)}`,
				routePath: ROUTES.SERVICE_METRICS,
			},
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

	it.each([
		{ spanMetrics: false, unit: 'ns' },
		{ spanMetrics: true, unit: 'ms' },
	])(
		'reads the latency in $unit when span metrics is $spanMetrics',
		({ spanMetrics, unit }) => {
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
				undefined,
				{
					initialRoute: '/services/frontend',
					routePath: ROUTES.SERVICE_METRICS,
					appContextOverrides: {
						featureFlags: defaultFeatureFlags.map((flag) =>
							flag.name === FeatureKeys.USE_SPAN_METRICS
								? { ...flag, active: spanMetrics }
								: flag,
						),
					},
				},
			);

			expect(jest.mocked(Graph).mock.calls[0][0].widget.yAxisUnit).toBe(unit);
		},
	);
});
