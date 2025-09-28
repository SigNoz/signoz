import './Support.styles.scss';

import { Button, Card, Modal, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import updateCreditCardApi from 'api/v1/checkout/create';
import { FeatureKeys } from 'constants/features';
import { useNotifications } from 'hooks/useNotifications';
import {
	ArrowUpRight,
	Book,
	CreditCard,
	Github,
	LifeBuoy,
	MessageSquare,
	Slack,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { SuccessResponseV2 } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import APIError from 'types/api/error';

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
		icon: <Book size={16} />,
		title: 'Find answers in the documentation.',
		url: 'https://signoz.io/docs/',
		btnText: 'Visit docs',
		isExternal: true,
	},
	{
		key: 'github',
		name: 'Github',
		icon: <Github size={16} />,
		title: 'Create an issue on GitHub to report bugs or request new features.',
		url: 'https://github.com/SigNoz/signoz/issues',
		btnText: 'Create issue',
		isExternal: true,
	},
	{
		key: 'slack_community',
		name: 'Slack Community',
		icon: <Slack size={16} />,
		title: 'Get support from the SigNoz community on Slack.',
		url: 'https://signoz.io/slack',
		btnText: 'Join Slack',
		isExternal: true,
	},
	{
		key: 'chat',
		name: 'Chat',
		icon: <MessageSquare size={16} />,
		title: 'Get quick support directly from the team.',
		url: '',
		btnText: 'Launch chat',
		isExternal: false,
	},
];

export default function Support(): JSX.Element {
	const history = useHistory();
	const { notifications } = useNotifications();
	const { trialInfo, featureFlags } = useAppContext();
	const [isAddCreditCardModalOpen, setIsAddCreditCardModalOpen] = useState(
		false,
	);

	const { pathname } = useLocation();
	const handleChannelWithRedirects = (url: string): void => {
		window.open(url, '_blank');
	};

	useEffect(() => {
		if (history?.location?.state) {
			const histroyState = history?.location?.state as any;

			if (histroyState && histroyState?.from) {
				logEvent(`Support : From URL : ${histroyState.from}`, {});
			}
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isPremiumChatSupportEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.PREMIUM_SUPPORT)
			?.active || false;

	const showAddCreditCardModal =
		!isPremiumChatSupportEnabled && !trialInfo?.trialConvertedToSubscription;

	const handleBillingOnSuccess = (
		data: SuccessResponseV2<CheckoutSuccessPayloadProps>,
	): void => {
		if (data?.data?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.data.redirectURL;
			newTab.target = '_blank';
			newTab.rel = 'noopener noreferrer';
			newTab.click();
		}
	};

	const handleBillingOnError = (error: APIError): void => {
		notifications.error({
			message: error.getErrorCode(),
			description: error.getErrorMessage(),
		});
	};

	const { mutate: updateCreditCard, isLoading: isLoadingBilling } = useMutation(
		updateCreditCardApi,
		{
			onSuccess: (data) => {
				handleBillingOnSuccess(data);
			},
			onError: handleBillingOnError,
		},
	);

	const handleAddCreditCard = (): void => {
		logEvent('Add Credit card modal: Clicked', {
			source: `help & support`,
			page: pathname,
		});

		updateCreditCard({
			url: window.location.origin,
		});
	};

	const handleChat = (): void => {
		if (showAddCreditCardModal) {
			logEvent('Disabled Chat Support: Clicked', {
				source: `help & support`,
				page: pathname,
			});
			setIsAddCreditCardModalOpen(true);
		} else if (window.pylon) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			window.Pylon('show');
		}
	};

	const handleChannelClick = (channel: Channel): void => {
		logEvent(`Support : ${channel.name}`, {});

		switch (channel.key) {
			case channelsMap.documentation:
			case channelsMap.github:
			case channelsMap.slack_community:
				handleChannelWithRedirects(channel.url);
				break;
			case channelsMap.chat:
				handleChat();
				break;
			default:
				handleChannelWithRedirects('https://signoz.io/slack');
				break;
		}
	};

	return (
		<div className="support-page-container">
			<header className="support-page-header">
				<div className="support-page-header-title" data-testid="support-page-title">
					<LifeBuoy size={16} />
					Support
				</div>
			</header>

			<div className="support-page-content">
				<div className="support-page-content-description">
					We are here to help in case of questions or issues. Pick the channel that
					is most convenient for you.
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
										className="periscope-btn secondary support-channel-btn"
										type="default"
										onClick={(): void => handleChannelClick(channel)}
									>
										<Text ellipsis>{channel.btnText} </Text>
										{channel.isExternal && <ArrowUpRight size={14} />}
									</Button>
								</div>
							</Card>
						),
					)}
				</div>
			</div>

			{/* Add Credit Card Modal */}
			<Modal
				className="add-credit-card-modal"
				title={<span className="title">Add Credit Card for Chat Support</span>}
				open={isAddCreditCardModalOpen}
				closable
				onCancel={(): void => setIsAddCreditCardModalOpen(false)}
				destroyOnClose
				footer={[
					<Button
						key="cancel"
						onClick={(): void => setIsAddCreditCardModalOpen(false)}
						className="cancel-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						key="submit"
						type="primary"
						icon={<CreditCard size={16} />}
						size="middle"
						loading={isLoadingBilling}
						disabled={isLoadingBilling}
						onClick={handleAddCreditCard}
						className="add-credit-card-btn periscope-btn primary"
					>
						Add Credit Card
					</Button>,
				]}
			>
				<Typography.Text className="add-credit-card-text">
					You&apos;re currently on <span className="highlight-text">Trial plan</span>
					. Add a credit card to access SigNoz chat support to your workspace.
				</Typography.Text>
			</Modal>
		</div>
	);
}
