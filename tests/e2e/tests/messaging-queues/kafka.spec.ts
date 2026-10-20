import { expect, KAFKA_VIEWS, test } from '../../drivers/messaging-queues';

test.describe('Messaging queues, kafka', () => {
	test('TC-01 kafka page renders its view cards and the health check', async ({
		mq,
		noise,
	}) => {
		await mq.gotoKafka();

		await expect(mq.viewDetailsButtons()).toHaveCount(KAFKA_VIEWS.length);
		await mq.openHealthCheck();
		await expect(mq.healthCheckSection('Consumers')).toBeVisible();
		await expect(mq.healthCheckSection('Producers')).toBeVisible();

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a view card opens its detail view', async ({ mq }) => {
		await mq.gotoKafka();
		await mq.viewDetails('producerLatency');

		await expect(mq.viewSelect()).toContainText('Producer Latency view');
		await expect(mq.producerLatencyToggle()).toBeVisible();
	});

	test('TC-03 producer latency lists the seeded topic and switches to consumers', async ({
		mq,
		mqSeed,
	}) => {
		await mq.gotoKafkaDetail('producerLatency');
		await mq.waitForTableRow(mq.table('overview'), mqSeed.topic);

		await expect(mq.producerLatencyOption('Producers')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await expect(mq.tableRow(mq.table('overview'), mqSeed.topic)).toContainText(
			mqSeed.producer,
		);

		await mq.producerLatencyOption('Consumers').click();
		await expect(mq.producerLatencyOption('Consumers')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		const consumerRow = mq.tableRow(mq.table('overview'), mqSeed.topic);
		await expect(consumerRow).toContainText(mqSeed.consumer);
		// `ingestion_rate` is the consumer query's own column.
		await expect(
			mq.tableHeader(mq.table('overview'), 'Ingestion Rate'),
		).toBeVisible();
	});

	test('TC-04 partition latency lists partition 0 and its consumer group', async ({
		mq,
		mqSeed,
	}) => {
		await mq.gotoKafkaDetail('partitionLatency');
		await mq.waitForTableRow(mq.table('overview'), mqSeed.topic);

		const row = mq.tableRow(mq.table('overview'), mqSeed.topic);
		await expect(row).toContainText(mqSeed.partition);
		await row.click();
		await expect(mq.table('detail')).toBeVisible();

		await mq.detailType('consumer-details').click();
		await expect(mq.tableRow(mq.table('detail'), mqSeed.group)).toContainText(
			mqSeed.consumer,
		);
	});

	test('TC-05 drop rate evaluates the seeded producer to consumer pair', async ({
		mq,
		mqSeed,
	}) => {
		test.skip(
			true,
			'stack limitation: /kafka/span/evaluation answers 400 "span evaluation feature is disabled" until the stack starts with SIGNOZ_FLAGGER_CONFIG_BOOLEAN_KAFKA__SPAN__EVAL=true',
		);
		await mq.gotoKafkaDetail('dropRate');
		await mq.waitForTableRow(mq.dropRateTable(), mqSeed.producer);

		await expect(mq.tableRow(mq.dropRateTable(), mqSeed.producer)).toContainText(
			mqSeed.consumer,
		);
	});

	test('TC-06 consumer lag draws the seeded gauge and its point details', async ({
		mq,
		mqSeed,
	}) => {
		test.skip(
			true,
			'stack limitation: the graph runs the legacy metrics query (__normalized = false) and the seeder writes __normalized = true series, so the result is empty',
		);
		await mq.gotoConsumerLagPoint(mqSeed);

		await expect(mq.consumerLagChart()).toBeVisible();
		await expect(mq.consumerLagNoData()).toBeHidden();

		// The deep-linked timeline point stands in for a canvas click.
		await mq.waitForTableRow(mq.table('detail'), mqSeed.producer);
		await mq.detailType('consumer-details').click();
		await expect(mq.detailType('consumer-details')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await expect(mq.tableRow(mq.table('detail'), mqSeed.consumer)).toBeVisible();
	});

	test('TC-07 metric view renders its sections', async ({ mq, noise }) => {
		await mq.gotoKafkaDetail('metricPage');

		await expect(mq.metricPageSection('Broker JVM Metrics')).toBeVisible();
		await expect(mq.metricPageSection('Partition Metrics')).toBeVisible();

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});
});
