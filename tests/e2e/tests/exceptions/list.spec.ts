import { expect, test } from '../../drivers/exceptions';

const HEADERS = [
	'Exception Type',
	'Error Message',
	'Count',
	'Last Seen',
	'First Seen',
	'Application',
];

test.describe('Exceptions, list and detail', () => {
	test('TC-01 exceptions page renders with no console errors', async ({
		exceptions,
		noise,
	}) => {
		await exceptions.gotoList();

		await expect(exceptions.tab('All Exceptions')).toBeVisible();
		await expect(async () => {
			expect(await exceptions.headers()).toEqual(HEADERS);
		}).toPass();
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a seeded exception group is listed with its count', async ({
		exceptions,
		exceptionSeed,
	}) => {
		const { timeout } = exceptionSeed.groups;
		await exceptions.gotoList({ serviceName: exceptionSeed.service });
		await exceptions.waitForRow(timeout.type);

		await expect(await exceptions.cell(timeout.type, 'Count')).toHaveText(
			String(timeout.count),
		);
		await expect(await exceptions.cell(timeout.type, 'Application')).toHaveText(
			exceptionSeed.service,
		);
		await expect(
			await exceptions.cell(timeout.type, 'Error Message'),
		).toContainText(exceptionSeed.stamp);
	});

	test('TC-03 application column search narrows to the seeded service', async ({
		exceptions,
		exceptionSeed,
	}) => {
		const { timeout, value } = exceptionSeed.groups;
		await exceptions.gotoList({ serviceName: exceptionSeed.service });
		await exceptions.waitForRow(timeout.type);
		await exceptions.gotoList();

		await exceptions.filterByService(exceptionSeed.service);

		await expect(exceptions.row(timeout.type)).toBeVisible();
		await expect(exceptions.row(value.type)).toBeVisible();
		expect(new Set(await exceptions.applications())).toEqual(
			new Set([exceptionSeed.service]),
		);
	});

	test('TC-04 exception detail shows the event, stack and trace link', async ({
		exceptions,
		exceptionSeed,
	}) => {
		const { timeout } = exceptionSeed.groups;
		const latest = timeout.spans[timeout.spans.length - 1];
		await exceptions.gotoList({ serviceName: exceptionSeed.service });
		await exceptions.waitForRow(timeout.type);

		await exceptions.openRow(timeout.type);
		const { detail } = exceptions;
		await expect(detail.type()).toHaveText(timeout.type);
		await expect(detail.message()).toHaveText(timeout.message);
		await expect(detail.stacktrace()).toContainText(exceptionSeed.frame);
		await expect(detail.attributes()).toContainText(exceptionSeed.service);

		const latestEvent = (await detail.eventId().innerText()).trim();
		await expect(detail.newerButton()).toBeDisabled();
		await detail.older();
		await expect(detail.eventId()).not.toHaveText(latestEvent);
		await expect(detail.olderButton()).toBeDisabled();
		await detail.newer();
		await expect(detail.eventId()).toHaveText(latestEvent);

		const trace = await detail.viewTrace();
		expect(trace.pathname).toBe(`/trace/${latest.trace_id}`);
		expect(trace.searchParams.get('spanId')).toBe(latest.span_id);
	});
});
