import {
	DEFAULT_CUSTOM_FILTERS,
	expect,
	LOGS_EXPLORER_PATH,
	test,
} from '../../drivers/explorers';

test.describe('Quick Filters — settings drawer', () => {
	test('TC-01 the settings gear opens a visible, populated drawer', async ({
		quickFilters,
	}) => {
		await quickFilters.seed('logs', DEFAULT_CUSTOM_FILTERS);
		await quickFilters.gotoExplorer(LOGS_EXPLORER_PATH);

		await quickFilters.openSettings();
		await quickFilters.expectSettingsOpen(DEFAULT_CUSTOM_FILTERS);
		await quickFilters.closeSettings();

		await expect(quickFilters.rail()).toBeVisible();
	});
});
