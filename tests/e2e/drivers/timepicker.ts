import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The top-nav time range picker (`CustomTimePicker`), shared by every page that
 * shows one. Presets are addressed by their URL value (`15m`, `1h`, `6h`, `1d`).
 */

export interface TimePicker {
	input(): Locator;
	open(): Promise<void>;
	/** Pick a preset and wait for `relativeTime=<value>` in the URL. */
	pickPreset(value: string): Promise<void>;
	/** Type shorthand such as `2h` and press Enter. */
	typeRange(text: string): Promise<void>;
	/** Logs explorer list view only. */
	goLive(): Promise<void>;
	/** Open the timezone list, search it, and pick the row with `value`. */
	pickTimezone(search: string, value: string): Promise<void>;
	urlParams(): { relativeTime?: string; startTime?: string; endTime?: string };
}

export function timePickerDriver(page: Page): TimePicker {
	const picker: TimePicker = {
		input: () => page.getByTestId('dropDown'),

		open: async () => {
			const input = picker.input();
			await input.click();
			await expect(input).not.toHaveAttribute('readonly');
		},

		pickPreset: async (value) => {
			await picker.open();
			await page.getByTestId(`time-option-${value}`).click();
			await expect(page).toHaveURL(new RegExp(`relativeTime=${value}(&|$)`));
		},

		typeRange: async (text) => {
			await picker.open();
			await picker.input().fill(text);
			await page.keyboard.press('Enter');
		},

		goLive: async () => {
			await picker.open();
			await page.getByTestId('time-picker-live').click();
		},

		pickTimezone: async (search, value) => {
			await picker.open();
			await page.getByRole('button', { name: 'Change Timezone' }).click();
			await page.getByPlaceholder('Search timezones...').fill(search);
			await page.getByTestId(`timezone-item-${value}`).click();
		},

		urlParams: () => {
			const params = new URL(page.url()).searchParams;
			return {
				relativeTime: params.get('relativeTime') ?? undefined,
				startTime: params.get('startTime') ?? undefined,
				endTime: params.get('endTime') ?? undefined,
			};
		},
	};

	return picker;
}
