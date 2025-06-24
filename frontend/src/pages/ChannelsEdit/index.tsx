/* eslint-disable sonarjs/cognitive-complexity */

import './ChannelsEdit.styles.scss';

import { Typography } from 'antd';
import get from 'api/channels/get';
import Spinner from 'components/Spinner';
import {
	ChannelType,
	MsTeamsChannel,
	PagerChannel,
	SlackChannel,
	WebhookChannel,
} from 'container/CreateAlertChannels/config';
import EditAlertChannels from 'container/EditAlertChannels';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { Channels } from 'types/api/channels/getAll';
import APIError from 'types/api/error';

function ChannelsEdit(): JSX.Element {
	const { t } = useTranslation();

	// Extract channelId from URL pathname since useParams doesn't work in nested routing
	const { pathname } = window.location;
	const channelIdMatch = pathname.match(/\/settings\/channels\/edit\/([^/]+)/);
	const channelId = channelIdMatch ? channelIdMatch[1] : undefined;

	const { isFetching, isError, data, error } = useQuery<
		SuccessResponseV2<Channels>,
		APIError
	>(['getChannel', channelId], {
		queryFn: () =>
			get({
				id: channelId || '',
			}),
		enabled: !!channelId,
	});

	if (isError) {
		return (
			<Typography>
				{error?.getErrorMessage() || t('something_went_wrong')}
			</Typography>
		);
	}

	if (isFetching || !data?.data) {
		return <Spinner tip="Loading Channels..." />;
	}

	const { data: ChannelData } = data.data;

	const value = JSON.parse(ChannelData);

	const prepChannelConfig = (): {
		type: string;
		channel: SlackChannel & WebhookChannel & PagerChannel & MsTeamsChannel;
	} => {
		let channel: SlackChannel & WebhookChannel & PagerChannel & MsTeamsChannel = {
			name: '',
		};
		if (value && 'slack_configs' in value) {
			const slackConfig = value.slack_configs[0];
			channel = slackConfig;
			return {
				type: ChannelType.Slack,
				channel,
			};
		}

		if (value && 'msteamsv2_configs' in value) {
			const msteamsConfig = value.msteamsv2_configs[0];
			channel = msteamsConfig;
			return {
				type: ChannelType.MsTeams,
				channel,
			};
		}
		if (value && 'pagerduty_configs' in value) {
			const pagerConfig = value.pagerduty_configs[0];
			channel = pagerConfig;
			channel.details = JSON.stringify(pagerConfig.details);
			channel.detailsArray = { ...pagerConfig.details };
			return {
				type: ChannelType.Pagerduty,
				channel,
			};
		}

		if (value && 'opsgenie_configs' in value) {
			const opsgenieConfig = value.opsgenie_configs[0];
			channel = opsgenieConfig;
			return {
				type: ChannelType.Opsgenie,
				channel,
			};
		}

		if (value && 'email_configs' in value) {
			const emailConfig = value.email_configs[0];
			channel = emailConfig;
			return {
				type: ChannelType.Email,
				channel,
			};
		}

		if (value && 'webhook_configs' in value) {
			const webhookConfig = value.webhook_configs[0];
			channel = webhookConfig;
			channel.api_url = webhookConfig.url;

			if ('http_config' in webhookConfig) {
				const httpConfig = webhookConfig.http_config;
				if ('basic_auth' in httpConfig) {
					channel.username = webhookConfig.http_config?.basic_auth?.username;
					channel.password = webhookConfig.http_config?.basic_auth?.password;
				} else if ('authorization' in httpConfig) {
					channel.password = webhookConfig.http_config?.authorization?.credentials;
				}
			}
			return {
				type: ChannelType.Webhook,
				channel,
			};
		}
		return {
			type: ChannelType.Slack,
			channel,
		};
	};

	const target = prepChannelConfig();

	return (
		<div className="edit-alert-channels-container">
			<EditAlertChannels
				{...{
					initialValue: {
						...target.channel,
						type: target.type,
						name: value.name,
					},
				}}
			/>
		</div>
	);
}

export default ChannelsEdit;
