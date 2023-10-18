import './Support.styles.scss';

import { Button, Card, Typography } from 'antd';
import {
	Book,
	Cable,
	Calendar,
	Github,
	MessageSquare,
	Slack,
} from 'lucide-react';

const { Title, Text } = Typography;

interface Channel {
	key: any;
	name?: string;
	icon?: JSX.Element;
	title?: string;
	url: any;
	btnText?: string;
}

const channelsMap = {
	documentation: 'documentation',
	github: 'github',
	slack_community: 'slack_community',
	chat: 'chat',
	schedule_call: 'schedule_call',
	slack_connect: 'slack_connect',
};

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
		btnText: 'Launch chat',
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

export default function Support(): JSX.Element {
	const handleChannelWithRedirects = (url: string): void => {
		window.open(url, '_blank');
	};

	const handleSlackConnectRequest = (): void => {
		const recipient = 'support@signoz.io';
		const subject = 'Slack Connect Request';
		const body = `I'd like to request a dedicated Slack Connect channel for me and my team. Users (emails) to include besides mine:`;

		// Create the mailto link
		const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(
			subject,
		)}&body=${encodeURIComponent(body)}`;

		// Open the default email client
		window.location.href = mailtoLink;
	};

	const handleChat = (): void => {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		if (window.Intercom) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			window.Intercom('show');
		}
	};

	const handleChannelClick = (channel: Channel): void => {
		switch (channel.key) {
			case channelsMap.documentation:
			case channelsMap.github:
			case channelsMap.slack_community:
			case channelsMap.schedule_call:
				handleChannelWithRedirects(channel.url);
				break;
			case channelsMap.chat:
				handleChat();
				break;
			case channelsMap.slack_connect:
				handleSlackConnectRequest();
				break;
			default:
				handleChannelWithRedirects('https://signoz.io/slack');
				break;
		}
	};

	return (
		<div className="support-page-container">
			<div className="support-page-header">
				<Title level={3}> Support </Title>
				<Text style={{ fontSize: 14 }}>
					We are here to help in case of questions or issues. Pick the channel that
					is most convenient for you.
				</Text>
			</div>

			<div className="support-channels">
				{supportChannels.map(
					(channel): JSX.Element => (
						<Card className="support-channel" key={channel.key}>
							<div className="support-channel-content">
								<Title ellipsis level={5} className="support-channel-title">
									{channel.icon}
									{channel.name}{' '}
								</Title>
								<Text> {channel.title} </Text>
							</div>

							<div className="support-channel-action">
								<Button
									type="default"
									onClick={(): void => handleChannelClick(channel)}
								>
									<Text ellipsis>{channel.btnText} </Text>
								</Button>
							</div>
						</Card>
					),
				)}
			</div>
		</div>
	);
}
