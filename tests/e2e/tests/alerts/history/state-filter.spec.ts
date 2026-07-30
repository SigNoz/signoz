import { expect, test } from '../../../fixtures/alert-history';
import {
	expectFirstPage,
	gotoAlertHistory,
	isHistoryRequest,
	timelineRows,
} from '../../../helpers/alerts';
import { requestUrl } from '../../../helpers/common';

test.describe('Alert history — state filter', () => {
	test('AF-01 All filter sends no state param in request', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
		});

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-filter-all').click();
		const request = await requestPromise;

		await expect(page).toHaveURL(/[?&]timelineFilter=ALL/);
		expect(requestUrl(request).searchParams.get('state')).toBeNull();
	});

	test('AF-02 Fired filter sends state=firing in request', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-filter-fired').click();
		const request = await requestPromise;

		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);
		expect(requestUrl(request).searchParams.get('state')).toBe('firing');
		await expect(timelineRows(page).first()).toBeVisible();
	});

	test('AF-03 Resolved filter shows empty for rule with no resolutions', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-filter-resolved').click();
		const request = await requestPromise;

		await expect(page).toHaveURL(/[?&]timelineFilter=RESOLVED/);
		expect(requestUrl(request).searchParams.get('state')).toBe('inactive');
		await expect(timelineRows(page)).toHaveCount(0);
	});

	test('AF-03b Resolved filter shows rows for rule with resolutions', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId, {
			timelineFilter: 'RESOLVED',
		});

		await expect(timelineRows(page)).toHaveCount(resolvedHistory.resolvedCount);
		for (const text of await timelineRows(page)
			.getByTestId('timeline-row-state')
			.allInnerTexts()) {
			expect(text).toBe('Resolved');
		}

		await page.getByTestId('timeline-filter-fired').click();
		await expect(timelineRows(page)).toHaveCount(resolvedHistory.firingCount);
	});

	test('AF-04 deep-link ?timelineFilter=FIRED starts on Fired tab', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
		});

		await expect(page.getByTestId('timeline-filter-fired')).toHaveClass(
			/selected/,
		);
		await expect(timelineRows(page).first()).toBeVisible();
	});

	test('AF-05 changing state filter resets pagination to first page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		await page.getByTestId('timeline-filter-fired').click();

		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expectFirstPage(page);
	});
});
