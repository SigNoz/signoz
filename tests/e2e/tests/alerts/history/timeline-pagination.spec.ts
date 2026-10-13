import { expect, test } from '../../../fixtures/alerts/alert-history';
import { TIMELINE_PAGE_SIZE } from '../../../helpers/alerts/constants';
import {
	encodeTimelineCursor,
	expectFirstPage,
	gotoAlertHistory,
	isHistoryRequest,
	sortTimelineDescending,
	timelineFooterRange,
	timelineRowLabels,
	timelineRows,
} from '../../../helpers/alerts/history';
import { requestUrl } from '../../../helpers/common';

test.describe('Alert history — timeline pagination', () => {
	test('TC-01 next page sends cursor and shows different rows', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page).first()).toBeVisible();
		const firstPageLabels = await timelineRowLabels(page);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-next-page').click();
		const request = await requestPromise;

		expect(requestUrl(request).searchParams.get('cursor')).toBe(
			encodeTimelineCursor(2),
		);
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
		await expect(timelineFooterRange(page)).toHaveText(
			`${TIMELINE_PAGE_SIZE + 1} — ${alertHistory.total} of ${alertHistory.total}`,
		);
		await expect(page.getByTestId('timeline-prev-page')).toBeEnabled();

		expect(await timelineRowLabels(page)).not.toEqual(firstPageLabels);
	});

	test('TC-02 prev page drops the cursor from request', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-prev-page').click();
		const request = await requestPromise;

		expect(requestUrl(request).searchParams.get('cursor')).toBeNull();
		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('TC-03 pagination buttons disable at first and last page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(page.getByTestId('timeline-prev-page')).toBeDisabled();
		await expect(page.getByTestId('timeline-next-page')).toBeEnabled();

		await page.getByTestId('timeline-next-page').click();

		await expect(page.getByTestId('timeline-next-page')).toBeDisabled();
		await expect(page.getByTestId('timeline-prev-page')).toBeEnabled();
	});

	test('TC-04 browser back after paging returns to previous page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await page.getByTestId('timeline-next-page').click();
		await expect(page).toHaveURL(/[?&]page=2/);

		await page.goBack();

		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('TC-05 deep-link ?page=2 loads second page directly', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requestPromise = page.waitForRequest(
			(req) =>
				isHistoryRequest(req, 'timeline') &&
				requestUrl(req).searchParams.get('cursor') === encodeTimelineCursor(2),
		);
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });
		await requestPromise;

		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
	});

	test('TC-06 default sort order is ascending', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		const request = await requestPromise;

		expect(new URL(page.url()).searchParams.get('order')).toBeNull();
		expect(requestUrl(request).searchParams.get('order')).toBe('asc');
	});

	test('TC-07 sorting toggles order and resets to first page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		await sortTimelineDescending(page);

		await expect(page).toHaveURL(/[?&]order=desc/);
		await expectFirstPage(page);
	});

	test('TC-08 single page disables both pagination buttons', async ({
		authedPage: page,
		metricsHistory,
	}) => {
		await gotoAlertHistory(page, metricsHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(metricsHistory.total);
		await expect(page.getByTestId('timeline-prev-page')).toBeDisabled();
		await expect(page.getByTestId('timeline-next-page')).toBeDisabled();
		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${metricsHistory.total} of ${metricsHistory.total}`,
		);
	});

	test('TC-09 all pages together cover the complete row set', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page).first()).toBeVisible();
		const pageOne = await timelineRowLabels(page);

		await page.getByTestId('timeline-next-page').click();
		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
		await expect(timelineFooterRange(page)).toHaveText(
			`${TIMELINE_PAGE_SIZE + 1} — ${alertHistory.total} of ${alertHistory.total}`,
		);
		const pageTwo = await timelineRowLabels(page);

		const union = new Set([...pageOne, ...pageTwo]);
		expect(pageOne.length + pageTwo.length).toBe(alertHistory.total);
		expect(union.size).toBe(alertHistory.total);
	});
});
