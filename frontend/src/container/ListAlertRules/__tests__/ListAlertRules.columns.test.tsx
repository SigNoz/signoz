import {
	screen,
	userEvent,
	waitFor,
	NO_DELAY_USER_EVENT,
} from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

const COLUMN_STORAGE_KEY = '@signoz/table-columns/alert-rules-columns';
const CREATED_AT_HEADER_TEST_ID = 'tanstack-header-createdAt';

describe('ListAlertRules — columns selector', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it('opens columns popover and lists toggleable columns', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
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

		['createdAt', 'createdBy', 'updatedAt', 'updatedBy'].forEach((columnId) => {
			expect(
				screen.queryByTestId(`tanstack-header-${columnId}`),
			).not.toBeInTheDocument();
		});
	});

	it('toggling Created At on writes to localStorage and adds the header', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		expect(
			screen.queryByTestId(CREATED_AT_HEADER_TEST_ID),
		).not.toBeInTheDocument();

		await user.click(screen.getByTestId('alert-columns-button'));
		await screen.findByText('Toggle Columns');

		await user.click(screen.getByTestId('alert-columns-button-column-createdAt'));

		await waitFor(() => {
			const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
			expect(stored).not.toBeNull();
			const parsed = JSON.parse(stored as string);
			expect(parsed.hiddenColumnIds).not.toContain('createdAt');
		});

		await expect(
			screen.findByTestId(CREATED_AT_HEADER_TEST_ID),
		).resolves.toHaveTextContent('Created At');
	});
});
