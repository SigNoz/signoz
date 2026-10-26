import {
	belowTheFold,
	expect,
	noDataOf,
	PANEL_KINDS,
	PanelMessageText,
	QUERYABLE_KINDS,
	type QueryRangeBody,
	SINGLE_PANEL_ID,
	test,
} from '../../../drivers/panel-kinds';

// Scope: every kind mounts its renderer, fetches lazily, and shows the shared
// PanelBody states. States are mock-only: a healthy stack always returns data.

function required(body: QueryRangeBody | null): QueryRangeBody {
	expect(body, 'a queryable kind declares mock bodies').not.toBeNull();
	return body as QueryRangeBody;
}

test.describe('Dashboards contract — rendering', () => {
	for (const c of PANEL_KINDS) {
		test(`TC-01 ${c.label}: mounts its own renderer`, async ({
			dashboards,
			panels,
		}) => {
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await target.waitRendered(c.kind);
			await expect(target.renderer(c.kind)).toBeVisible();
		});
	}

	for (const c of QUERYABLE_KINDS) {
		test(`TC-02 ${c.label}: does not query below the fold until scrolled into view`, async ({
			dashboards,
			panels,
		}) => {
			await dashboards.seedAndOpen(belowTheFold(c));

			const target = panels.panel(SINGLE_PANEL_ID);
			await expect(target.visibility()).toHaveAttribute(
				'data-panel-visible',
				'false',
			);
			await expect(target.renderer(c.kind)).toHaveCount(0);

			await target.scrollIntoView();
			await expect(target.visibility()).toHaveAttribute(
				'data-panel-visible',
				'true',
			);
			await expect(target.renderer(c.kind)).toBeVisible();
		});
	}

	for (const c of QUERYABLE_KINDS) {
		test(`TC-03 ${c.label}: an empty result offers Extend time range as primary and Retry as secondary`, async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await queryRange.respond(required(c.emptyBody()));
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			const noData = noDataOf(c, target);
			await expect(noData.root()).toBeVisible();
			await expect(target.text(PanelMessageText.noDataTitle)).toBeVisible();
			await expect(noData.action()).toHaveText(PanelMessageText.extendAction);
			await expect(noData.secondaryAction()).toHaveText(
				PanelMessageText.retryAction,
			);
			await expect(target.heatmap.colorBar()).toHaveCount(0);
		});
	}

	for (const c of QUERYABLE_KINDS) {
		test(`TC-04 ${c.label}: a failing query shows the error state and Retry refetches`, async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			// Fail every call, then swap to success before Retry: react-query retries
			// on its own, so "fail once then succeed" never surfaces the error state.
			await queryRange.fail('querier exploded');
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await expect(target.error()).toBeVisible();
			await expect(target.statusError()).toBeVisible();
			await expect(target.text(PanelMessageText.errorTitle)).toBeVisible();
			await expect(target.text('querier exploded')).toBeVisible();

			await queryRange.reset();
			await queryRange.respond(required(c.body()));

			await target.errorAction().click();
			await expect(target.error()).toHaveCount(0);
			await expect(target.renderer(c.kind)).toBeVisible();
		});
	}

	for (const c of QUERYABLE_KINDS) {
		test(`TC-05 ${c.label}: an in-flight first query shows the loading state`, async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			// LOADING, not `panel-refetching` — the refetch spinner needs prior data.
			const held = await queryRange.hold(required(c.body()));
			await dashboards.seedAndOpen(c.seed());

			const target = panels.panel(SINGLE_PANEL_ID);
			await expect(target.loading()).toBeVisible();

			held.release();
			await expect(target.renderer(c.kind)).toBeVisible();
			await expect(target.loading()).toHaveCount(0);
		});
	}
});
