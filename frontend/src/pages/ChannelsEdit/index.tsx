import { Typography } from 'antd';
import get from 'api/channels/get';
import Spinner from 'components/Spinner';
import {
	PagerChannel,
	PagerType,
	SlackChannel,
	SlackType,
	WebhookChannel,
	WebhookType,
} from 'container/CreateAlertChannels/config';
import EditAlertChannels from 'container/EditAlertChannels';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';

function ChannelsEdit(): JSX.Element {
	const { id } = useParams<Params>();
	const { t } = useTranslation();

	const { isLoading, isError, data } = useQuery(['getChannel', id], {
		queryFn: () =>
			get({
				id,
			}),
	});

	if (isError) {
		return <Typography>{data?.error || t('something_went_wrong')}</Typography>;
	}

	if (isLoading || !data?.payload) {
		return <Spinner tip="Loading Channels..." />;
	}

	const { data: ChannelData } = data.payload;

	const value = JSON.parse(ChannelData);

	const prepChannelConfig = (): {
		type: string;
		channel: SlackChannel & WebhookChannel & PagerChannel;
	} => {
		let channel: SlackChannel & WebhookChannel & PagerChannel = { name: '' };
		if (value && 'slack_configs' in value) {
			const slackConfig = value.slack_configs[0];
			channel = slackConfig;
			return {
				type: SlackType,
				channel,
			};
		}
		if (value && 'pagerduty_configs' in value) {
			const pagerConfig = value.pagerduty_configs[0];
			channel = pagerConfig;
			channel.details = JSON.stringify(pagerConfig.details);
			channel.detailsArray = { ...pagerConfig.details };
			return {
				type: PagerType,
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
				type: WebhookType,
				channel,
			};
		}
		return {
			type: SlackType,
			channel,
		};
	};

	const target = prepChannelConfig();

	return (
		<EditAlertChannels
			{...{
				initialValue: {
					...target.channel,
					type: target.type,
					name: value.name,
				},
			}}
		/>
	);
}
interface Params {
	id: string;
}

export default ChannelsEdit;
