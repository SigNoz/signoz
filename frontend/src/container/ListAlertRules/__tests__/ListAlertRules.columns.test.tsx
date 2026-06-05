import userEvent from '@testing-library/user-event';
import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

const COLUMN_STORAGE_KEY = '@signoz/table-columns/alert-rules-columns';

describe('ListAlertRules — columns selector', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('opens columns popover and lists toggleable columns', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.click(screen.getByTestId('alert-columns-button'));

		// Popover should reveal "Toggle Columns" heading + per-column labels.
		await screen.findByText('Toggle Columns');
		expect(screen.getByText('Created At')).toBeInTheDocument();
		expect(screen.getByText('Created By')).toBeInTheDocument();
		expect(screen.getByText('Updated At')).toBeInTheDocument();
		expect(screen.getByText('Updated By')).toBeInTheDocument();
	});

	it('default-hidden columns (Created At/By, Updated At/By) are not in the table header', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		const headers = document.querySelectorAll('th');
		const headerTexts = Array.from(headers).map((h) => h.textContent || '');
		expect(headerTexts.some((t) => t.includes('Created At'))).toBe(false);
		expect(headerTexts.some((t) => t.includes('Created By'))).toBe(false);
		expect(headerTexts.some((t) => t.includes('Updated At'))).toBe(false);
		expect(headerTexts.some((t) => t.includes('Updated By'))).toBe(false);
	});

	it('toggling Created At on writes to localStorage and adds the header', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		const headersBefore = Array.from(document.querySelectorAll('th')).map(
			(h) => h.textContent ?? '',
		);
		expect(headersBefore.some((t) => t.includes('Created At'))).toBe(false);

		await user.click(screen.getByTestId('alert-columns-button'));
		await screen.findByText('Toggle Columns');

		const checkbox = document.getElementById('col-createdAt');
		expect(checkbox).not.toBeNull();
		await user.click(checkbox as HTMLElement);

		await waitFor(() => {
			const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
			expect(stored).not.toBeNull();
			const parsed = JSON.parse(stored as string);
			expect(parsed.hiddenColumnIds).not.toContain('createdAt');
		});

		await waitFor(() => {
			const headersAfter = Array.from(document.querySelectorAll('th')).map(
				(h) => h.textContent ?? '',
			);
			expect(headersAfter.some((t) => t.includes('Created At'))).toBe(true);
		});
	});
});
