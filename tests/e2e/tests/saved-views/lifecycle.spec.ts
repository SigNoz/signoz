import {
	expect,
	LOG_COLUMNS,
	logsView,
	test,
	uniqueViewName,
} from '../../drivers/saved-views';

const SAVED_FILTER = "service.name = 'frontend'";
const EDITED_FILTER = "service.name = 'cartservice'";

test.describe('Saved views: lifecycle on the logs explorer', () => {
	test('TC-01 a view created from the header survives a reload clean', async ({
		savedViews,
	}) => {
		const displayName = uniqueViewName('create');
		await savedViews.openExplorer();
		await savedViews.expectNoView();
		await savedViews.applyFilter(SAVED_FILTER);

		const id = await savedViews.createFromHeader(displayName);
		await expect(savedViews.toast('View created')).toBeVisible();
		await expect.poll(() => savedViews.activeViewId()).toBe(id);
		await savedViews.expectClean(displayName);

		const stored = await savedViews.get(id);
		expect(stored.source).toBe('logs');
		expect(stored.spec.displayName).toBe(displayName);
		expect(stored.spec.panelType).toBe('list');
		expect(JSON.stringify(stored.spec.queries)).toContain(SAVED_FILTER);

		await savedViews.reload(SAVED_FILTER);
		await savedViews.expectClean(displayName);
		await expect(savedViews.queryBar()).toHaveText(SAVED_FILTER);

		await savedViews.openList();
		await savedViews.search(displayName);
		await expect(savedViews.row(id)).toBeVisible();
		await expect(savedViews.rowLink(id)).toHaveAttribute('aria-current', 'page');
	});

	test('TC-02 an edited view turns dirty, updates, and opens with the new filter after a reload', async ({
		savedViews,
	}) => {
		const view = await savedViews.seed(
			logsView({
				displayName: uniqueViewName('update'),
				filter: SAVED_FILTER,
			}),
		);
		await savedViews.openExplorer();
		await savedViews.open(view);
		await savedViews.expectClean(view.displayName);

		await savedViews.applyFilter(EDITED_FILTER);
		await savedViews.expectDirty(view.displayName);

		await savedViews.update();
		await savedViews.expectClean(view.displayName);

		const stored = await savedViews.get(view.id);
		expect(JSON.stringify(stored.spec.queries)).toContain(EDITED_FILTER);
		expect(JSON.stringify(stored.spec.queries)).not.toContain(SAVED_FILTER);

		await savedViews.reload(EDITED_FILTER);
		await savedViews.expectClean(view.displayName);
		await expect(savedViews.queryBar()).toHaveText(EDITED_FILTER);
	});

	test('TC-03 discarding changes brings back the stored filter and tab', async ({
		savedViews,
	}) => {
		const view = await savedViews.seed(
			logsView({
				displayName: uniqueViewName('discard'),
				filter: SAVED_FILTER,
			}),
		);
		await savedViews.openExplorer();
		await savedViews.open(view);
		await expect(savedViews.explorerTab('list')).toHaveClass(/active-tab/);

		await savedViews.applyFilter(EDITED_FILTER);
		await savedViews.explorerTab('timeseries').click();
		await expect(savedViews.explorerTab('timeseries')).toHaveClass(/active-tab/);
		await savedViews.expectDirty(view.displayName);

		await savedViews.discard();
		await savedViews.expectClean(view.displayName);
		await expect(savedViews.queryBar()).toHaveText(SAVED_FILTER);
		await expect(savedViews.explorerTab('list')).toHaveClass(/active-tab/);
		expect(savedViews.param('panelTypes')).toBe('"list"');

		const stored = await savedViews.get(view.id);
		expect(JSON.stringify(stored.spec.queries)).toContain(SAVED_FILTER);
	});

	test('TC-04 deleting the open view clears it without trying to load it again', async ({
		savedViews,
	}) => {
		const view = await savedViews.seed(
			logsView({
				displayName: uniqueViewName('delete'),
				filter: SAVED_FILTER,
			}),
		);
		await savedViews.openExplorer();
		await savedViews.open(view);

		await savedViews.chooseRowAction(view.id, 'delete');
		const getsBeforeDelete = savedViews.viewGets(view.id).length;
		expect(getsBeforeDelete).toBeGreaterThan(0);
		await savedViews.deleteView(view.id);

		await expect(savedViews.toast('View deleted')).toBeVisible();
		await expect(savedViews.row(view.id)).toHaveCount(0);
		await savedViews.expectNoView();
		await expect.poll(() => savedViews.param('panelTypes')).toBeNull();
		expect(savedViews.param('viewName')).toBeNull();
		expect(savedViews.param('compositeQuery') ?? '').not.toContain('frontend');
		expect(savedViews.viewGets(view.id)).toHaveLength(getsBeforeDelete);
		expect(await savedViews.status(view.id)).toBe(404);
	});

	test('TC-05 renaming a view keeps its columns and display settings', async ({
		savedViews,
	}) => {
		const columns = [
			LOG_COLUMNS.timestamp,
			LOG_COLUMNS.body,
			LOG_COLUMNS.serviceName,
			LOG_COLUMNS.severityText,
		];
		const headers = ['Timestamp', 'Body', 'service.name', 'severity_text'];
		const display = { format: 'table', maxLines: 3, fontSize: 'medium' };
		const view = await savedViews.seed(
			logsView({
				displayName: uniqueViewName('rename'),
				filter: SAVED_FILTER,
				columns,
				display,
			}),
		);
		const renamed = uniqueViewName('renamed');

		const expectDisplay = async (): Promise<void> => {
			await expect(savedViews.logsColumnHeaders()).toHaveText(headers);
			await savedViews.openLogsFormatMenu();
			await expect(savedViews.selectedLogsFormat()).toHaveText('Column');
			await expect(savedViews.logsMaxLines()).toHaveValue('3');
			await expect(savedViews.logsFontSize()).toHaveText('medium');
			await savedViews.closeLogsFormatMenu();
		};

		await savedViews.openExplorer('logs', { relativeTime: '1d' });
		await savedViews.open(view);
		await expectDisplay();

		await savedViews.openList();
		await savedViews.search(view.displayName);
		await savedViews.rename(view.id, renamed);
		await expect(savedViews.toast('View updated')).toBeVisible();
		await expect(savedViews.name()).toHaveText(renamed);

		const stored = await savedViews.get(view.id);
		expect(stored.spec.displayName).toBe(renamed);
		expect(stored.spec.selectedFields?.map((column) => column.name)).toEqual(
			columns.map((column) => column.name),
		);
		expect(stored.spec.display).toMatchObject(display);

		await savedViews.reload(SAVED_FILTER);
		await savedViews.expectClean(renamed);
		await expectDisplay();
	});
});
