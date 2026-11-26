/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';
import { rest } from 'msw';
import type { MessagingQueuesViewTypeOptions } from 'pages/MessagingQueues/MessagingQueuesUtils';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';
import { queryRangeV5ForRequest } from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	attributeValues,
	LABEL_VALUES,
	timeRangeState,
} from '../../stories/__story_mockdata__/messagingQueues';
import {
	consumerLagDetails,
	KAFKA_VIEWS,
	kafkaDetailRoute,
	partitionLatencyDetails,
	partitionLatencyOverview,
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
			'http://localhost/api/v5/query_range',
			response.json(async (req) =>
				queryRangeV5ForRequest(
					(await req.json()) as Querybuildertypesv5QueryRangeRequestDTO,
					{ count: values.series, labelValues: LABEL_VALUES },
				),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) =>
				fieldValuesResponse(
					attributeValues(
						req.url.searchParams.get('name') ?? '',
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),
		),
	],
	config: ({ view, selected }) => ({
		route: kafkaDetailRoute(view, selected),
		reduxState: timeRangeState(),
	}),
});

export type KafkaDetailArgs = PageStoryArgs<typeof kafkaDetailMocks>;
