import { expect, type Locator, type Page } from '@playwright/test';

import { DEFAULT_CUSTOM_FILTERS, quickFiltersDriver } from '../explorers';
import { inputField } from '../input';
import { SEEDED_DATA_TIMEOUT } from '../kit';

/** The quick-filters rail on the logs explorer. */

export interface LogsRail {
	/** The same payload the settings spec seeds, so parallel seeding agrees. */
	ensureSeeded(): Promise<void>;
	/** Put back what `ensureSeeded` replaced; the layer runs it after every test. */
	restore(): Promise<void>;
	section(key: string): Locator;
	/** Filter the list to `value` only, through the value row's Only action. */
	only(key: string, value: string): Promise<void>;
}

export function logsRailDriver(page: Page): LogsRail {
	const quickFilters = quickFiltersDriver(page);

	const rail: LogsRail = {
		ensureSeeded: () => quickFilters.seed('logs', DEFAULT_CUSTOM_FILTERS),

		restore: () => quickFilters.restore(),

		section: (key) => page.locator(`[data-filter-key="${key}"]`),

		only: async (key, value) => {
			const section = rail.section(key);
			const header = section.getByTestId('checkbox-filter-header');
			await expect(header).toBeVisible();
			if ((await header.getAttribute('data-state')) !== 'open') {
				await header.click();
			}
			await expect(header).toHaveAttribute('data-state', 'open');

			// The service list is global and grows with every worker, so search it
			// rather than scroll it. The search box renders only once the section
			// holds more values than it shows.
			const searchBox = inputField(section, 'checkbox-filter-search');
			const row = section.getByTestId(`checkbox-value-row-${value}`);
			await expect(searchBox.or(row).first()).toBeVisible({
				timeout: SEEDED_DATA_TIMEOUT,
			});
			if (await searchBox.isVisible()) {
				await searchBox.fill(value);
			}
			await expect(row).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
			await row.getByText(value, { exact: true }).click();
		},
	};

	return rail;
}
