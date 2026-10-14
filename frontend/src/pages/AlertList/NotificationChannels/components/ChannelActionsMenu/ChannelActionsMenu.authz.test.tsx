import { AlertmanagertypesListedNotificationChannelDTO } from 'api/generated/services/sigNoz.schemas';
import { AUTHZ_CHECK_URL } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import ChannelActionsMenu from './ChannelActionsMenu';

const FIND = { timeout: 5000 };
const BATCH_SETTLE_MS = 250;

const CHANNEL = {
	id: '3',
	name: 'ops-slack',
	displayName: 'ops slack',
	kind: 'slack',
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z',
} as AlertmanagertypesListedNotificationChannelDTO;

/** Selectors every authz check asked about, in the order they were requested. */
function recordSelectors(): string[] {
	const selectors: string[] = [];
	server.use(
		rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
			const body = (await req.json()) as { object: { selector: string } }[];
			selectors.push(...body.map((check) => check.object.selector));
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: body.map((check) => ({ ...check, authorized: true })),
				}),
			);
		}),
	);
	return selectors;
}

describe('ChannelActionsMenu - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it('checks the channel only once its menu is opened', async () => {
		// the authz API caps one batch at 25 transactions, so a list that checked
		// three verbs for every row would start failing at eight channels
		const selectors = recordSelectors();

		render(
			<ChannelActionsMenu
				channel={CHANNEL}
				onOpen={jest.fn()}
				onDelete={jest.fn()}
				onViewJson={jest.fn()}
			/>,
		);

		const trigger = await screen.findByTestId('channel-actions-3', {}, FIND);

		// useAuthZ coalesces checks over a 50ms window, so proving none were sent
		// means outlasting it
		await new Promise((resolve) => {
			setTimeout(resolve, BATCH_SETTLE_MS);
		});
		expect(selectors).toHaveLength(0);

		await userEvent.setup({ delay: null }).click(trigger);

		await waitFor(() => expect(selectors).toContain('3'), FIND);
	});
});
