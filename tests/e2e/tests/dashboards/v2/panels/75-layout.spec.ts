import type { Page } from '@playwright/test';

import { expect, test } from '../../../../fixtures/dashboards';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	boundingBoxOf,
	panelResizeHandle,
	panelRoot,
} from '../../../../helpers/panels-v2';
import {
	COMPACT_PANELS,
	compactDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: grid layout mutations — drag, resize, and the guarantee that the
// header's action cluster never starts a drag.
//
// react-grid-layout exposes no testids; `.panel-drag-handle` and
// `.react-resizable-handle` are the documented class contract it is configured
// with (draggableHandle / draggableCancel in SectionGrid), so they're used
// directly here.

/** Grid geometry for one panel, read from the persisted spec. */
async function gridItemOf(
	page: Page,
	dashboardId: string,
	panelId: string,
): Promise<{ x: number; y: number; width: number; height: number }> {
	const dashboard = await getDashboardV2ViaApi(page, dashboardId);
	for (const layout of dashboard.spec.layouts) {
		const item = layout.spec.items.find(
			(candidate) => candidate.content.$ref === `#/spec/panels/${panelId}`,
		);
		if (item) {
			return {
				x: item.x,
				y: item.y,
				width: item.width,
				height: item.height,
			};
		}
	}
	throw new Error(`no grid item for panel ${panelId}`);
}

test.describe('Dashboards V2 — grid layout', () => {
	test('TC-01 resizing a panel persists its new size', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();
		const before = await gridItemOf(page, id, COMPACT_PANELS.timeseries);

		const handle = await boundingBoxOf(
			panelResizeHandle(page, COMPACT_PANELS.timeseries),
			'the resize handle',
		);
		await page.mouse.move(
			handle.x + handle.width / 2,
			handle.y + handle.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(handle.x + 60, handle.y + 90, { steps: 12 });
		await page.mouse.up();

		// The grid persists on resize-stop, so the spec is the source of truth
		// rather than the rendered pixel size.
		await expect
			.poll(async () => {
				const after = await gridItemOf(page, id, COMPACT_PANELS.timeseries);
				return after.height > before.height || after.width > before.width;
			})
			.toBe(true);
	});

	test('TC-02 a resized layout survives a reload', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();

		const handle = await boundingBoxOf(
			panelResizeHandle(page, COMPACT_PANELS.timeseries),
			'the resize handle',
		);
		await page.mouse.move(
			handle.x + handle.width / 2,
			handle.y + handle.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(handle.x, handle.y + 90, { steps: 12 });
		await page.mouse.up();

		await expect
			.poll(async () => {
				const item = await gridItemOf(page, id, COMPACT_PANELS.timeseries);
				return item.height;
			})
			.toBeGreaterThan(6);

		const persisted = await gridItemOf(page, id, COMPACT_PANELS.timeseries);
		await page.reload();
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();
		expect(await gridItemOf(page, id, COMPACT_PANELS.timeseries)).toEqual(
			persisted,
		);
	});

	test('TC-03 opening the actions menu does not start a drag', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();
		const before = await gridItemOf(page, id, COMPACT_PANELS.timeseries);

		// The ⋮ button sits inside the drag handle but is marked `panel-no-drag`
		// and stops pointerdown, so opening the menu must leave the grid alone.
		await root.hover();
		await page.getByTestId(`panel-actions-${COMPACT_PANELS.timeseries}`).click();
		await expect(page.getByRole('menu')).toBeVisible();
		await page.keyboard.press('Escape');

		expect(await gridItemOf(page, id, COMPACT_PANELS.timeseries)).toEqual(before);
	});

	test('TC-04 dragging by the header moves the panel within its section', async ({
		authedPage: page,
		dashboards,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();
		const before = await gridItemOf(page, id, COMPACT_PANELS.timeseries);

		const handle = await boundingBoxOf(
			root.locator('.panel-drag-handle').first(),
			'the drag handle',
		);
		await page.mouse.move(
			handle.x + handle.width / 4,
			handle.y + handle.height / 2,
		);
		await page.mouse.down();
		// Drag a full tile-width right so the swap is unambiguous.
		await page.mouse.move(handle.x + handle.width, handle.y + handle.height / 2, {
			steps: 15,
		});
		await page.mouse.up();

		await expect
			.poll(async () => {
				const after = await gridItemOf(page, id, COMPACT_PANELS.timeseries);
				return after.x !== before.x || after.y !== before.y;
			})
			.toBe(true);
	});
});
