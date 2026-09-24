import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { screen, userEvent, waitFor } from 'tests/test-utils';

import { renderChannels } from './renderChannels';

const FIND = { timeout: 5000 };
const TEST_TIMEOUT = 20000;

describe('Notification channels list', () => {
	beforeEach(() => {
		// search, filter and page live in the url, so one test's filter would
		// otherwise still be applied in the next
		window.history.replaceState({}, '', '/');
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it(
		'heads the page with the channel count',
		async () => {
			renderChannels();

			await expect(
				screen.findByText('All notification channels', {}, FIND),
			).resolves.toBeInTheDocument();
			// the count comes from the API's total, not the loaded page
			await expect(screen.findByText('2', {}, FIND)).resolves.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		'lists every channel with its type',
		async () => {
			renderChannels();

			await expect(
				screen.findByText('Dummy-Channel', {}, FIND),
			).resolves.toBeInTheDocument();
			expect(screen.getByText('Oncall PagerDuty')).toBeInTheDocument();
			// the type reads as plain text, no colour coding
			expect(screen.getByText('Slack')).toBeInTheDocument();
			expect(screen.getByText('PagerDuty')).toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		'filters server-side as the user types',
		async () => {
			renderChannels();

			await screen.findByText('Dummy-Channel', {}, FIND);

			await userEvent.type(screen.getByTestId('channels-search'), 'oncall');

			await waitFor(() => {
				expect(screen.queryByText('Dummy-Channel')).not.toBeInTheDocument();
			}, FIND);
			await expect(
				screen.findByText('Oncall PagerDuty', {}, FIND),
			).resolves.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		'asks for confirmation before deleting, from the row menu',
		async () => {
			renderChannels();

			await screen.findByText('Dummy-Channel', {}, FIND);
			// the table paints a loading layer over the rows until the fetch settles
			const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
			await user.click(screen.getByTestId('channel-actions-3'));
			// Radix renders the menu into a portal once the trigger is activated
			await screen.findByRole('menu', {}, FIND);

			// Delete stays disabled until the per-channel permission check resolves
			const deleteItem = await screen.findByRole(
				'menuitem',
				{ name: 'Delete' },
				FIND,
			);
			await waitFor(
				() => expect(deleteItem).not.toHaveAttribute('aria-disabled', 'true'),
				FIND,
			);
			await user.click(deleteItem);

			await expect(
				screen.findByTestId('channel-delete-confirm', {}, FIND),
			).resolves.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);
});
