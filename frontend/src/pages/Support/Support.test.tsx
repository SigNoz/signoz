import { Calendar } from 'antd';
import { Book, Cable, Github, MessageSquare, Slack } from 'lucide-react';
import { fireEvent, render } from 'tests/test-utils';

import Support from './Support';

const launchChat = 'Launch chat';
const useAnalyticsMock = jest.fn();
const useHistoryMock = jest.fn();

jest.mock('hooks/analytics/useAnalytics', () => ({
	__esModule: true,
	default: jest.fn(() => ({ trackEvent: useAnalyticsMock })),
}));

jest.mock('react-router-dom', () => ({
	useHistory: useHistoryMock,
}));

const supportChannels = [
	{
		key: 'documentation',
		name: 'Documentation',
		icon: <Book />,
		title: 'Find answers in the documentation.',
		url: 'https://signoz.io/docs/',
		btnText: 'Visit docs',
	},
	{
		key: 'github',
		name: 'Github',
		icon: <Github />,
		title: 'Create an issue on GitHub to report bugs or request new features.',
		url: 'https://github.com/SigNoz/signoz/issues',
		btnText: 'Create issue',
	},
	{
		key: 'slack_community',
		name: 'Slack Community',
		icon: <Slack />,
		title: 'Get support from the SigNoz community on Slack.',
		url: 'https://signoz.io/slack',
		btnText: 'Join Slack',
	},
	{
		key: 'chat',
		name: 'Chat',
		icon: <MessageSquare />,
		title: 'Get quick support directly from the team.',
		url: '',
		btnText: launchChat,
	},
	{
		key: 'schedule_call',
		name: 'Schedule a call',
		icon: <Calendar />,
		title: 'Schedule a call with the founders.',
		url: 'https://calendly.com/pranay-signoz/signoz-intro-calls',
		btnText: 'Schedule call',
	},
	{
		key: 'slack_connect',
		name: 'Slack Connect',
		icon: <Cable />,
		title: 'Get a dedicated support channel for your team.',
		url: '',
		btnText: 'Request Slack connect',
	},
];

describe('Help and Support renders correctly', () => {
	it('should render the support page with all support channels', () => {
		const { getByText } = render(<Support />);
		expect(getByText('Support')).toBeInTheDocument();
		expect(
			getByText(
				'We are here to help in case of questions or issues. Pick the channel that is most convenient for you.',
			),
		).toBeInTheDocument();
		supportChannels.forEach((channel) => {
			expect(getByText(channel.name)).toBeInTheDocument();
			expect(getByText(channel.title)).toBeInTheDocument();
			expect(getByText(channel.btnText)).toBeInTheDocument();
		});
	});
	it('should trigger correct handler function when channel button is clicked', () => {
		const { getByText } = render(<Support />);
		const button = getByText('Visit docs');
		const windowOpenMock = jest.spyOn(window, 'open').mockImplementation();
		fireEvent.click(button);
		expect(windowOpenMock).toHaveBeenCalledWith(
			'https://signoz.io/docs/',
			'_blank',
		);
	});

	it('should open Intercom chat widget when Chat channel is clicked', () => {
		window.Intercom = jest.fn();
		const { getByText } = render(<Support />);
		const button = getByText(launchChat);
		fireEvent.click(button);
		expect(window.Intercom).toHaveBeenCalledWith('show');
	});
});

describe('Handle channels with null or undefined properties', () => {
	it('should handle window.Intercom being undefined or null', () => {
		window.Intercom = null;
		const { getByText } = render(<Support />);
		const button = getByText(launchChat);
		fireEvent.click(button);
		expect(window.Intercom).toBeNull();
	});
	it('should handle missing or undefined history.location.state', () => {
		const trackEvent = jest.fn();
		useHistoryMock.mockReturnValue({ location: {} });
		render(<Support />);
		expect(trackEvent).not.toHaveBeenCalled();
	});
	it('should handle missing or undefined channel.url', () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation();
		const { getByText } = render(<Support />);
		fireEvent.click(getByText(launchChat));
		expect(openSpy).not.toHaveBeenCalled();
		openSpy.mockRestore();
	});
	it('should handle missing or undefined channel.name', () => {
		const trackEvent = jest.fn();
		const handleChannelClick = jest.fn();
		const channelWithoutName = { key: 'chat', url: '' };
		render(<Support />);
		handleChannelClick(channelWithoutName);
		expect(trackEvent).not.toHaveBeenCalledWith();
	});
});
