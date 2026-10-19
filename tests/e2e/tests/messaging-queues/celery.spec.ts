import { expect, test } from '../../drivers/messaging-queues';

test.describe('Messaging queues, celery', () => {
	test('TC-01 celery page draws span-based stats for the seeded task', async ({
		mq,
		mqSeed,
		noise,
	}) => {
		await mq.gotoCelery();
		await mq.pickTask(mqSeed.task);

		await expect(mq.celeryGridSection('Span Based Stats')).toBeVisible();
		await expect(mq.celeryGridSection('Flower Metrics')).toBeVisible();
		await expect(mq.celeryGridChart()).toBeVisible();

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 state tabs count the seeded task by state', async ({
		mq,
		mqSeed,
	}) => {
		await mq.gotoCeleryTask(mqSeed.task, 'failed', mqSeed.states.failed);

		await expect(mq.celeryStateTab('all')).toHaveText(
			new RegExp(`\\D${mqSeed.states.all}$`),
		);
		await expect(mq.celeryStateTab('successful')).toHaveText(
			new RegExp(`\\D${mqSeed.states.successful}$`),
		);
		await expect(mq.celeryStateTab('retry')).toHaveText(
			new RegExp(`\\D${mqSeed.states.retry}$`),
		);

		await mq.selectCeleryState('failed');
		await expect(mq.celeryGridChart()).toBeVisible();
	});
});
