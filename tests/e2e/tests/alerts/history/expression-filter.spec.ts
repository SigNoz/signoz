import { expect, test } from '../../../fixtures/alerts/alert-history';
import { TIMELINE_PAGE_SIZE } from '../../../helpers/alerts/constants';
import {
	expectFirstPage,
	gotoAlertHistory,
	isHistoryRequest,
	runFilterExpression,
	timelineFooterRange,
	timelineRows,
	waitForHistoryResponse,
} from '../../../helpers/alerts/history';
import { requestUrl } from '../../../helpers/common';
import { typeExpression } from '../../../helpers/query-builder';

test.describe('Alert history — expression filter', () => {
	test('TC-01 key suggestions load on page load', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const keysPromise = page.waitForResponse((res) =>
			/\/history\/filter_keys/.test(res.url()),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		const keysResponse = await keysPromise;

		const body = (await keysResponse.json()) as {
			data: { keys: Record<string, { name: string }[]> } | null;
		};
		expect(Object.keys(body.data?.keys ?? {}).sort()).toEqual([
			'service.name',
			'severity',
			'threshold.name',
		]);
		const params = new URL(keysResponse.url()).searchParams;
		expect(params.get('startUnixMilli')).toBeTruthy();
		expect(params.get('endUnixMilli')).toBeTruthy();

		await expect(page.getByTestId('timeline-filter-search')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-skeleton')).toHaveCount(0);
	});

	test('TC-02 value suggestions fetch from filter_values endpoint', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const valuesPromise = page.waitForResponse((res) =>
			/\/history\/filter_values/.test(res.url()),
		);
		await typeExpression(page, "service.name = '");
		const valuesResponse = await valuesPromise;

		const params = new URL(valuesResponse.url()).searchParams;
		expect(params.get('name')).toBe('service.name');

		const body = (await valuesResponse.json()) as {
			data: { values?: { stringValues?: string[] }; complete?: boolean } | null;
		};
		expect(body.data?.values?.stringValues).toEqual(
			[...alertHistory.services].sort(),
		);
		expect(body.data?.complete).toBe(true);
	});

	test('TC-03 value suggestions filter client-side as user types', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await typeExpression(page, "service.name = 'svc-1");

		const options = page.locator('.cm-tooltip-autocomplete li');
		await expect(options.first()).toBeVisible();
		const texts = await options.allInnerTexts();
		expect(texts.length).toBeGreaterThan(0);
		expect(texts.length).toBeLessThan(alertHistory.services.length);
		for (const text of texts) {
			expect(text).toContain('svc-1');
		}
	});

	test('TC-04 running equality expression filters the table', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const service = alertHistory.services[3];

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await runFilterExpression(page, `service.name = '${service}'`);
		const request = await requestPromise;

		expect(requestUrl(request).searchParams.get('filterExpression')).toBe(
			`service.name = '${service}'`,
		);
		await expect(timelineRows(page)).toHaveCount(1);
		await expect(page).toHaveURL(/[?&]alertHistoryExpression=/);
	});

	test('TC-05 running expression resets pagination to first page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		const responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(
			page,
			`service.name = '${alertHistory.services[0]}'`,
		);
		await responsePromise;

		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expectFirstPage(page);
	});

	test('TC-06 Run button re-fetches unchanged expression', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const expression = `service.name = '${alertHistory.services[1]}'`;
		const firstResponsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, expression);
		await firstResponsePromise;
		await expect(timelineRows(page)).toHaveCount(1);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByRole('button', { name: /run query/i }).click();
		await requestPromise;

		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('TC-07 in-flight query can be cancelled', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await page.route(
			(url) => /\/history\/timeline/.test(url.pathname),
			async (route) => {
				await new Promise((resolve) => {
					setTimeout(resolve, 3_000);
				});
				await route.continue();
			},
		);

		await typeExpression(page, `service.name = '${alertHistory.services[2]}'`);
		await page.getByRole('button', { name: /run query/i }).click();

		const cancel = page.getByRole('button', { name: 'Cancel' });
		await expect(cancel).toBeVisible();
		await cancel.click();

		await page.unrouteAll({ behavior: 'ignoreErrors' });
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /run query/i })).toBeVisible();
	});

	test('TC-08 threshold.name and severity keys filter correctly', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		let responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, `threshold.name = 'critical'`);
		await responsePromise;
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);

		responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, `severity = 'critical'`);
		await responsePromise;
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);

		await gotoAlertHistory(page, alertHistory.ruleIdV1);
		responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, `threshold.name = 'warning'`);
		await responsePromise;
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.totalV1}`,
		);

		responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, `threshold.name = 'critical'`);
		await responsePromise;
		await expect(timelineRows(page)).toHaveCount(0);
	});

	test('TC-09 unknown key returns 200 with zero rows (not 500)', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, `nonexistent.key = 'x'`);
		const response = await responsePromise;

		expect(response.status()).toBe(200);
		await expect(timelineRows(page)).toHaveCount(0);
		await expect(page.getByTestId('timeline-error')).toHaveCount(0);
	});

	test('TC-10 expression is lost on Overview→History round-trip (known bug)', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const expression = `service.name = '${alertHistory.services[4]}'`;
		const responsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(page, expression);
		await responsePromise;
		await expect(timelineRows(page)).toHaveCount(1);
		await expect(page).toHaveURL(/[?&]alertHistoryExpression=/);

		await page.getByTestId('alert-details-tab-overview').click();
		await page.getByTestId('alert-details-tab-history').click();

		await expect(page.getByTestId('timeline-table')).toBeVisible();
		expect(new URL(page.url()).searchParams.has('alertHistoryExpression')).toBe(
			false,
		);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
	});

	test('TC-11 expression and state filter compose in request', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
		});

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		const service = alertHistory.services[5];
		await runFilterExpression(page, `service.name = '${service}'`);
		const request = await requestPromise;

		const params = requestUrl(request).searchParams;
		expect(params.get('state')).toBe('firing');
		expect(params.get('filterExpression')).toBe(`service.name = '${service}'`);
		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('TC-12 clearing expression restores full unfiltered list', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const firstResponsePromise = waitForHistoryResponse(page, 'timeline');
		await runFilterExpression(
			page,
			`service.name = '${alertHistory.services[6]}'`,
		);
		await firstResponsePromise;
		await expect(timelineRows(page)).toHaveCount(1);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await runFilterExpression(page, '');
		const request = await requestPromise;

		expect(requestUrl(request).searchParams.get('filterExpression')).toBeNull();
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);
	});
});
