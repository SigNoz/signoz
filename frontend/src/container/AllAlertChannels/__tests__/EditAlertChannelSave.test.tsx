import EditAlertChannels from 'container/EditAlertChannels';
import { editAlertChannelInitialValue } from 'mocks-server/__mockdata__/alerts';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

jest.mock('hooks/useNotifications', () => ({
	__esModule: true,
	useNotifications: jest.fn(() => ({
		notifications: { success: jest.fn(), error: jest.fn() },
	})),
}));

jest.mock('components/MarkdownRenderer/MarkdownRenderer', () => ({
	MarkdownRenderer: jest.fn(() => <div>Mocked MarkdownRenderer</div>),
}));

interface EditRequest {
	id: string;
	body: { name: string; slack_configs: { send_resolved: boolean }[] };
}

// Captures the PUT /channels/:id request the edit form fires, so assertions can
// run against the real HTTP payload instead of a hand-mocked api client.
function mockEditChannel(): { calls: EditRequest[] } {
	const result: { calls: EditRequest[] } = { calls: [] };
	server.use(
		rest.put('http://localhost/api/v1/channels/:id', async (req, res, ctx) => {
			result.calls.push({
				id: req.params.id as string,
				body: await req.json(),
			});
			return res(
				ctx.status(200),
				ctx.json({ status: 'success', data: 'channel updated' }),
			);
		}),
	);
	return result;
}

describe('EditAlertChannels save', () => {
	afterEach(() => jest.clearAllMocks());

	it('sends the channelId in the edit request (regression: empty id)', async () => {
		const edit = mockEditChannel();
		render(
			<EditAlertChannels
				channelId="3"
				initialValue={editAlertChannelInitialValue}
			/>,
		);

		const user = userEvent.setup();
		await user.click(screen.getByTestId('save-channel-button'));

		await waitFor(() => expect(edit.calls).toHaveLength(1));
		expect(edit.calls[0].id).toBe('3');
	});

	it('persists send_resolved toggle in the edit request', async () => {
		const edit = mockEditChannel();
		render(
			<EditAlertChannels
				channelId="3"
				initialValue={editAlertChannelInitialValue}
			/>,
		);

		const user = userEvent.setup();
		const sendResolved = screen.getByTestId('field-send-resolved-checkbox');
		expect(sendResolved).toBeChecked();

		await user.click(sendResolved);
		await user.click(screen.getByTestId('save-channel-button'));

		await waitFor(() => expect(edit.calls).toHaveLength(1));
		expect(edit.calls[0].id).toBe('3');
		expect(edit.calls[0].body.slack_configs[0].send_resolved).toBe(false);
	});
});
