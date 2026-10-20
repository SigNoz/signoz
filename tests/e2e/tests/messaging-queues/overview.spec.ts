import { expect, test } from '../../drivers/messaging-queues';

test.describe('Messaging queues, overview', () => {
	test('TC-01 overview lists the seeded kafka and celery spans', async ({
		mq,
		mqSeed,
		noise,
	}) => {
		await mq.waitForOverviewRow(mqSeed.producer, `${mqSeed.topic} publish`);

		const producer = mq.overviewRow(mqSeed.producer, `${mqSeed.topic} publish`);
		await expect(producer).toHaveCount(1);
		await expect(producer).toContainText('kafka');
		await expect(producer).toContainText(mqSeed.topic);
		await expect(producer).toContainText('Producer');

		const consumer = mq.overviewRow(mqSeed.consumer, `${mqSeed.topic} process`);
		await expect(consumer).toContainText('Consumer');

		const celery = mq.overviewRow(mqSeed.celeryService, mqSeed.taskSpan);
		await expect(celery).toHaveCount(1);
		await expect(celery).toContainText('celery');

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 an overview row opens its details drawer', async ({
		mq,
		mqSeed,
	}) => {
		const span = `${mqSeed.topic} publish`;
		await mq.waitForOverviewRow(mqSeed.producer, span);
		await mq.openOverviewRow(mqSeed.producer, span);

		const drawer = mq.overviewDrawer();
		await expect(drawer).toContainText(mqSeed.producer);
		await expect(drawer).toContainText(span);
		await expect(mq.overviewDrawerMetric('Request Rate')).toBeVisible();
	});
});
