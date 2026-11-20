import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { Widgets } from 'types/api/widgets/widget';

import { getWidgetQuery } from '../MessagingQueuesUtils';
import * as MetricPageUtil from '../MQDetails/MetricPage/MetricPageUtil';

const v5Steps = (query: Query): unknown[] =>
	prepareQueryRangePayloadV5({
		query,
		graphType: PANEL_TYPES.TIME_SERIES,
		selectedTime: 'GLOBAL_TIME',
		start: 1_700_000_000,
		end: 1_700_000_000 + 7 * 24 * 3600,
	})
		.queryPayload.compositeQuery.queries.filter(
			(query) => query.type === 'builder_query',
		)
		.map((query) => (query.spec as { stepInterval?: unknown }).stepInterval);

const metricViewWidgets = Object.entries(MetricPageUtil)
	.filter(([name]) => name.endsWith('WidgetData'))
	.map(([name, getWidget]): [string, Query] => [
		name,
		(getWidget as () => Widgets)().query,
	]);

describe('Kafka metrics graphs on query_range v5', () => {
	it.each(metricViewWidgets)('%s leaves the step to v5', (_name, query) => {
		const steps = v5Steps(query);

		expect(steps).toStrictEqual(Array(steps.length).fill(null));
	});

	it('consumer lag leaves the step to v5', () => {
		expect(v5Steps(getWidgetQuery({ filterItems: [] }).query)).toStrictEqual([
			null,
		]);
	});
});
