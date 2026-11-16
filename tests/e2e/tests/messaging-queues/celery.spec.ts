import { expect, test } from '../../drivers/messaging-queues';

test.describe('Messaging queues, celery', () => {
	test('TC-01 celery dashboard draws span-based stats for the seeded task', async ({
		mq,
		mqSeed,
		noise,
	}) => {
		await mq.gotoCelery(mqSeed.task);

		await expect(mq.celerySection('Flower Metrics')).toBeVisible();
		await expect(mq.celerySection('Span Based Stats')).toBeVisible();
		await mq.celeryPanel('state-all').wheelIntoView();
		await expect(mq.celeryPanel('state-all').chart.plotArea()).toBeVisible();

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 task filter counts and splits the seeded runs by state and worker', async ({
		mq,
		mqSeed,
	}) => {
		await mq.gotoCelery(mqSeed.task);

		await expect(mq.celeryPanel('count-all').numberValue()).toHaveText('4');
		await expect(mq.celeryPanel('count-success').numberValue()).toHaveText('2');
		await expect(mq.celeryPanel('count-failed').numberValue()).toHaveText('1');
		await expect(mq.celeryPanel('count-retry').numberValue()).toHaveText('1');

		const byState = mq.celeryPanel('state-all');
		await byState.wheelIntoView();
		for (const state of ['SUCCESS', 'FAILURE', 'RETRY']) {
			await expect(byState.legend.item(state)).toBeVisible();
		}

		const failed = mq.celeryPanel('state-failed');
		await failed.wheelIntoView();
		await expect(failed.legend.item(mqSeed.worker)).toBeVisible();
	});
});
