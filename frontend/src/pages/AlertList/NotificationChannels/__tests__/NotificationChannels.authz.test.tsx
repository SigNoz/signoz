import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
	setupAuthzGrantByPrefix,
} from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { screen, userEvent, waitFor } from 'tests/test-utils';

import { renderChannels } from './renderChannels';

const FIND = { timeout: 5000 };
const TEST_TIMEOUT = 20000;

describe('Notification channels list - AuthZ', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it(
		'hides the list when list is denied',
		async () => {
			server.use(setupAuthzDenyAll());

			renderChannels();

			await expect(
				screen.findByText(/not authorized/i, {}, FIND),
			).resolves.toBeInTheDocument();
			expect(screen.queryByTestId('channels-search')).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		'disables creating when create is denied',
		async () => {
			server.use(setupAuthzDeny(NotificationChannelCreatePermission));

			renderChannels();

			await screen.findByText('Dummy-Channel', {}, FIND);
			await waitFor(
				() => expect(screen.getByTestId('channels-create')).toBeDisabled(),
				FIND,
			);
		},
		TEST_TIMEOUT,
	);

	it(
		'offers Edit to a user who can update the channel',
		async () => {
			server.use(setupAuthzAdmin());

			renderChannels();

			await screen.findByText('Dummy-Channel', {}, FIND);
			const user = userEvent.setup({ delay: null });
			await user.click(screen.getByTestId('channel-actions-3'));

			await expect(
				screen.findByRole('menuitem', { name: 'Edit' }, FIND),
			).resolves.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);

	it(
		'offers View instead when the channel can only be read',
		async () => {
			server.use(setupAuthzGrantByPrefix('read', 'list'));

			renderChannels();

			await screen.findByText('Dummy-Channel', {}, FIND);
			const user = userEvent.setup({ delay: null });
			await user.click(screen.getByTestId('channel-actions-3'));

			await expect(
				screen.findByRole('menuitem', { name: 'View' }, FIND),
			).resolves.toBeInTheDocument();
			expect(
				screen.queryByRole('menuitem', { name: 'Edit' }),
			).not.toBeInTheDocument();
		},
		TEST_TIMEOUT,
	);
});
