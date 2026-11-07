import {
	DESTINATION_FILTER_ATTRIBUTES,
	SUPPORTED_MESSAGING_SYSTEMS,
} from 'components/CeleryOverview/CeleryOverviewConfigOptions/CeleryOverviewConfigOptions';
import { RowData } from 'components/CeleryOverview/CeleryOverviewTable/CeleryOverviewTable';

import {
	buildOverviewDetailFilters,
	resolveDestinationTagKey,
} from '../CeleryOverviewDetails';

describe('Messaging Queue Overview multi-provider filter resolution', () => {
	it('exposes canonical queue providers including AWS SQS, Google Pub/Sub, AWS Kinesis, and Redis', () => {
		expect(SUPPORTED_MESSAGING_SYSTEMS).toEqual([
			'kafka',
			'celery',
			'aws_sqs',
			'gcp_pubsub',
			'aws_kinesis',
			'redis',
		]);
		expect(DESTINATION_FILTER_ATTRIBUTES).toEqual(
			expect.arrayContaining([
				'messaging.destination.name',
				'messaging.destination',
				'aws.sqs.queue.name',
				'aws.kinesis.stream.name',
				'celery.task_name',
				'db.redis.database_index',
			]),
		);
	});

	it('builds tag filters for AWS SQS, Google Pub/Sub, AWS Kinesis, and Redis rows', () => {
		const providers = ['aws_sqs', 'gcp_pubsub', 'aws_kinesis', 'redis'];

		providers.forEach((provider) => {
			const row: RowData = {
				key: provider,
				service_name: 'order-processor',
				span_name: 'publish-event',
				messaging_system: provider,
				destination: 'orders-stream',
				kind_string: 'Producer',
			};

			const filters = buildOverviewDetailFilters(row);
			const byKey = Object.fromEntries(
				filters.map((item) => [item.key?.key, item.value]),
			);

			expect(byKey['service.name']).toBe('order-processor');
			expect(byKey.name).toBe('publish-event');
			expect(byKey['messaging.system']).toBe(provider);
			expect(byKey['messaging.destination.name']).toBe('orders-stream');
			expect(byKey.kind_string).toBe('Producer');
		});
	});

	it('omits messaging.system filter for Celery and skips empty destinations', () => {
		const celeryRow: RowData = {
			key: 1,
			service_name: 'celery-worker',
			span_name: 'run/send_email',
			messaging_system: 'celery',
			destination: '   ',
			kind_string: 'Consumer',
		};

		expect(resolveDestinationTagKey(celeryRow)).toBe('messaging.destination');

		const filters = buildOverviewDetailFilters(celeryRow);
		const filterKeys = filters.map((item) => item.key?.key);

		expect(filterKeys).not.toContain('messaging.system');
		expect(filterKeys).not.toContain('messaging.destination');
		expect(filterKeys).toEqual(['service.name', 'name', 'kind_string']);
	});
});
