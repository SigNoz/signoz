import { PANEL_TYPES } from 'constants/queryBuilder';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import {
	createCustomTimeRange,
	createGlobalTimeStore,
	GlobalTimeContext,
	GlobalTimeStoreApi,
	NANO_SECOND_MULTIPLIER,
} from 'store/globalTime';
import { act, render } from 'tests/test-utils';

import { buildEntityMetricsChartConfig } from '../configBuilder';
import EntityMetrics from '../EntityMetrics';

jest.mock('../configBuilder', () => ({
	buildEntityMetricsChartConfig: jest.fn().mockReturnValue({
		getId: jest.fn().mockReturnValue('mock-id'),
	}),
}));

jest.mock('../../EntityDateTimeSelector/EntityDateTimeSelector', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="date-time-selection">Date Time</div>
	),
}));

const mockBuildChartConfig = buildEntityMetricsChartConfig as jest.Mock;

const START_MS = 1705315200000; // 2024-01-15T10:40:00Z
const END_MS = 1705318800000; // 2024-01-15T11:40:00Z
const START_SECONDS = 1705315200;
const END_SECONDS = 1705318800;

const entity = { id: 'test-entity-1' };

// The jsdom IntersectionObserver polyfill never reports visibility, so the
// queries stay disabled and no network request is issued.
const queryPayload = {
	graphType: PANEL_TYPES.TIME_SERIES,
} as unknown as GetQueryResultsProps;

function createStoreWithCustomRange(): GlobalTimeStoreApi {
	const store = createGlobalTimeStore();
	store
		.getState()
		.setSelectedTime(
			createCustomTimeRange(
				START_MS * NANO_SECOND_MULTIPLIER,
				END_MS * NANO_SECOND_MULTIPLIER,
			),
		);
	return store;
}

function renderEntityMetrics(store: GlobalTimeStoreApi): jest.Mock {
	const getEntityQueryPayload = jest.fn().mockReturnValue([queryPayload]);
	render(
		<GlobalTimeContext.Provider value={store}>
			<EntityMetrics
				entity={entity}
				eventEntity="test"
				entityWidgetInfo={[{ title: 'CPU Usage', yAxisUnit: 'percentage' }]}
				getEntityQueryPayload={getEntityQueryPayload}
				queryKey="test-query-key"
				category={InfraMonitoringEntity.PODS}
			/>
		</GlobalTimeContext.Provider>,
	);
	return getEntityQueryPayload;
}

describe('EntityMetrics time range wiring', () => {
	beforeEach(() => {
		mockBuildChartConfig.mockClear();
	});

	it('should build the metrics query payloads and chart config from the global time range in seconds', () => {
		const store = createStoreWithCustomRange();

		const getEntityQueryPayload = renderEntityMetrics(store);

		expect(getEntityQueryPayload).toHaveBeenCalledWith(
			entity,
			START_SECONDS,
			END_SECONDS,
			false,
		);
		expect(mockBuildChartConfig).toHaveBeenCalledWith(
			expect.objectContaining({
				minTimeScale: START_SECONDS,
				maxTimeScale: END_SECONDS,
			}),
		);
	});

	it('should store a drag selection (received in milliseconds) as the equivalent custom range', () => {
		const store = createStoreWithCustomRange();

		renderEntityMetrics(store);

		const { onDragSelect } = mockBuildChartConfig.mock.calls[0][0];

		// UPlotConfigBuilder's setSelect hook calls onDragSelect with milliseconds
		const dragStartMs = 1705316000000;
		const dragEndMs = 1705317000000;
		act(() => {
			onDragSelect(dragStartMs, dragEndMs);
		});

		expect(store.getState().selectedTime).toBe(
			createCustomTimeRange(
				dragStartMs * NANO_SECOND_MULTIPLIER,
				dragEndMs * NANO_SECOND_MULTIPLIER,
			),
		);
	});
});
