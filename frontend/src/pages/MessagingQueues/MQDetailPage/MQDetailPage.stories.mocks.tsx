/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest } from 'msw';
import type { MessagingQueuesViewTypeOptions } from 'pages/MessagingQueues/MessagingQueuesUtils';
import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	attributeValuesResponse,
	queryRangeV3ForRequest,
	timeRangeState,
} from '../__story_mockdata__/messagingQueues';
import {
	consumerLagDetails,
	KAFKA_VIEWS,
	kafkaDetailRoute,
	partitionLatencyDetails,
	partitionLatencyOverview,
	spanEvaluationResponse,
	topicThroughputDetails,
	topicThroughputOverview,
} from './__story_mockdata__/kafkaDetail';

const VIEWS = 'Kafka detail · views';
const DATA = 'Kafka detail · data';

/** Rows past the tenth are a second page, which is where the pager appears. */
const TABLE_MAX = 24;

export const kafkaDetailMocks = defineStoryMocks({
	controls: {
		view: choiceControl<MessagingQueuesViewTypeOptions>('View', {
			group: VIEWS,
			description:
				'The view the `mqServiceView` param selects, which is also what the header dropdown writes.',
			options: KAFKA_VIEWS,
			value: KAFKA_VIEWS[0],
		}),
		selected: toggleControl('Row selected', {
			group: VIEWS,
			description:
				'Whether the route already carries the co-ordinate or row the tables at the bottom need. Without it they ask to be clicked on.',
			value: true,
		}),
		rows: countControl('Table rows', {
			group: DATA,
			value: 12,
			max: TABLE_MAX,
		}),
		series: countControl('Graph series', {
			group: DATA,
			description:
				'Lines each chart draws: the consumer lag graph groups by consumer group, topic and partition, the metric view by broker.',
			value: 4,
			max: 8,
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v1/messaging-queues/kafka/consumer-lag/:detailType',
			response.json((req) =>
				consumerLagDetails(String(req.params.detailType), values.rows),
			),
		),

		rest.post(
			'http://localhost/api/v1/messaging-queues/kafka/partition-latency/overview',
			response.json(() => partitionLatencyOverview(values.rows)),
		),

		rest.post(
			'http://localhost/api/v1/messaging-queues/kafka/partition-latency/consumer',
			response.json(() => partitionLatencyDetails(values.rows)),
		),

		rest.post(
			'http://localhost/api/v1/messaging-queues/kafka/topic-throughput/:detailType',
			response.json((req) => {
				const detailType = String(req.params.detailType);

				return detailType.endsWith('-details')
					? topicThroughputDetails(values.rows)
					: topicThroughputOverview(detailType, values.rows);
			}),
		),

		rest.post(
			'http://localhost/api/v1/messaging-queues/kafka/span/evaluation',
			response.json(async (req) => {
				const body = (await req.json()) as { end: number };

				return {
					status: 'success',
					data: spanEvaluationResponse(values.rows, body.end / 1e6),
				};
			}),
		),

		rest.post(
			'http://localhost/api/v3/query_range',
			response.json(async (req) =>
				queryRangeV3ForRequest(
					(await req.json()) as QueryRangePayload,
					values.series,
				),
			),
		),

		rest.get(
			'http://localhost/api/v3/autocomplete/attribute_values',
			response.json((req) =>
				attributeValuesResponse(
					req.url.searchParams.get('attributeKey') ?? '',
					req.url.searchParams.get('searchText') ?? '',
				),
			),
		),
	],
	config: ({ view, selected }) => ({
		route: kafkaDetailRoute(view, selected),
		reduxState: timeRangeState(),
	}),
});
