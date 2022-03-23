import { Typography } from 'antd';
import get from 'api/channels/get';
import Spinner from 'components/Spinner';
import {
	SlackChannel,
	WebhookChannel,
	SlackType,
	WebhookType,
} from 'container/CreateAlertChannels/config';
import EditAlertChannels from 'container/EditAlertChannels';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { useParams } from 'react-router';
import { PayloadProps, Props } from 'types/api/channels/get';

function ChannelsEdit(): JSX.Element {
	const { id } = useParams<Params>();

	const { errorMessage, payload, error, loading } = useFetch<
		PayloadProps,
		Props
	>(get, {
		id,
	});

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || payload === undefined) {
		return <Spinner tip="Loading Channels..." />;
	}

	const { data } = payload;

	const value = JSON.parse(data);

	var type: string = '';
	var channel: SlackChannel & WebhookChannel = { name: '' };

	if (value && 'slack_configs' in value) {
		channel = value['slack_configs'][0];
		type = SlackType;
	} else if (value && 'webhook_configs' in value) {
		const webhook_config = value['webhook_configs'][0];
		channel = webhook_config;
		channel.api_url = webhook_config.url;

		if ('http_config' in webhook_config) {
			channel.username = webhook_config['http_config'].username;
			channel.password = webhook_config['http_config'].password;
		}
		type = WebhookType;
	}

	return (
		<EditAlertChannels
			{...{
				initialValue: {
					...channel,
					type: type,
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
