import './Support.styles.scss';

import { Button, Card, Modal, Typography } from 'antd';
import updateCreditCardApi from 'api/billing/checkout';
import logEvent from 'api/common/logEvent';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { FeatureKeys } from 'constants/features';
import { useNotifications } from 'hooks/useNotifications';
import {
	Book,
	CreditCard,
	Github,
	MessageSquare,
	Slack,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import { License } from 'types/api/licenses/def';

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
];

export default function Support(): JSX.Element {
	const history = useHistory();
	const { notifications } = useNotifications();
	const { licenses, featureFlags } = useAppContext();
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
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
		!isPremiumChatSupportEnabled && !licenses?.trialConvertedToSubscription;

	useEffect(() => {
		const activeValidLicense =
			licenses?.licenses?.find((license) => license.isCurrent === true) || null;

		setActiveLicense(activeValidLicense);
	}, [licenses?.licenses]);

	const handleBillingOnSuccess = (
		data: ErrorResponse | SuccessResponse<CheckoutSuccessPayloadProps, unknown>,
	): void => {
		if (data?.payload?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.payload.redirectURL;
			newTab.target = '_blank';
			newTab.rel = 'noopener noreferrer';
			newTab.click();
		}
	};

	const handleBillingOnError = (): void => {
		notifications.error({
			message: SOMETHING_WENT_WRONG,
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
			licenseKey: activeLicense?.key || '',
			successURL: window.location.href,
			cancelURL: window.location.href,
		});
	};

	const handleChat = (): void => {
		if (showAddCreditCardModal) {
			logEvent('Disabled Chat Support: Clicked', {
				source: `help & support`,
				page: pathname,
			});
			setIsAddCreditCardModalOpen(true);
		} else if (window.Intercom) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			window.Intercom('show');
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
						className="add-credit-card-btn"
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
