import { server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';

import ChannelForm from '../components/ChannelForm/ChannelForm';

const FIND = { timeout: 5000 };

describe('ChannelForm', () => {
	beforeEach(() => {
		window.history.replaceState({}, '', '/');
	});

	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it('prefills the channel it was opened on', async () => {
		render(<ChannelForm channelId="3" onDone={jest.fn()} />);

		// the form must not mount before the channel lands, or antd captures
		// empty initial values
		const name = await screen.findByTestId('channel-name-textbox', {}, FIND);
		expect(name).toHaveValue('Dummy-Channel');

		expect(screen.getByTestId('webhook-url-textbox')).toHaveValue(
			'https://hooks.slack.com/services/dummy',
		);
	}, 20000);
});
