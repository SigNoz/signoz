import { setupAuthzDenyAll } from 'lib/authz/utils/authz-test-utils';
import { notificationChannelsListResponse } from 'mocks-server/__mockdata__/alerts';
import { rest, server } from 'mocks-server/server';
import {
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from 'tests/test-utils';

import ChannelSelect from '..';

const CHANNELS_URL = 'http://localhost/api/v2/notification_channels';
const CHANNEL_SELECT = 'alert-channel-select';

const renderChannelSelect = (currentValue: string[] = []): void => {
	render(
		<ChannelSelect
			currentValue={currentValue}
			onSelectChannels={jest.fn()}
			handleCreateNewChannels={jest.fn()}
		/>,
	);
};

const channelInput = (): HTMLElement =>
	within(screen.getByTestId(CHANNEL_SELECT)).getByRole('combobox');

describe('ChannelSelect', () => {
	beforeEach(() => {
		server.use(setupAuthzDenyAll());
	});

	it('searches channels on the server as the user types', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const queries: (string | null)[] = [];
		server.use(
			rest.get(CHANNELS_URL, (req, res, ctx) => {
				const query = req.url.searchParams.get('query');
				queries.push(query);
				return res(
					ctx.json(
						notificationChannelsListResponse(
							query ? ['Oncall PagerDuty'] : ['Dummy-Channel', 'Oncall PagerDuty'],
						),
					),
				);
			}),
		);
		renderChannelSelect();

		await user.click(channelInput());
		await screen.findByTitle('Dummy-Channel');
		await user.type(channelInput(), 'pager');

		await waitFor(() => expect(queries).toContain('pager'));
		await expect(
			screen.findByTitle('Oncall PagerDuty'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTitle('Dummy-Channel')).not.toBeInTheDocument();
	});

	it('refetches the channels each time the dropdown opens', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		let requestCount = 0;
		server.use(
			rest.get(CHANNELS_URL, (_req, res, ctx) => {
				requestCount += 1;
				return res(ctx.json(notificationChannelsListResponse(['Dummy-Channel'])));
			}),
		);
		renderChannelSelect();
		await waitFor(() => expect(requestCount).toBe(1));

		await user.click(channelInput());

		await waitFor(() => expect(requestCount).toBe(2));
	});

	it('loads the next page when the list is scrolled to the bottom', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const offsets: string[] = [];
		server.use(
			rest.get(CHANNELS_URL, (req, res, ctx) => {
				const offset = Number(req.url.searchParams.get('offset'));
				offsets.push(String(offset));
				const names = Array.from(
					{ length: offset === 0 ? 100 : 20 },
					(_, index) => `channel-${offset + index}`,
				);
				return res(ctx.json(notificationChannelsListResponse(names, 120)));
			}),
		);
		renderChannelSelect();

		await user.click(channelInput());
		await screen.findByTitle('channel-0');
		fireEvent.scroll(
			document.querySelector('.rc-virtual-list-holder') as HTMLElement,
		);

		await waitFor(() => expect(offsets).toContain('100'));
	});

	it('keeps the name of a saved channel the results do not include', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		server.use(
			rest.get(CHANNELS_URL, (_req, res, ctx) =>
				res(ctx.json(notificationChannelsListResponse(['Dummy-Channel']))),
			),
		);
		renderChannelSelect(['old-pager']);

		await user.click(channelInput());
		await screen.findByTitle('Dummy-Channel');

		expect(
			within(screen.getByTestId(CHANNEL_SELECT)).getByTitle('old-pager'),
		).toHaveTextContent('old-pager');
	});
});
