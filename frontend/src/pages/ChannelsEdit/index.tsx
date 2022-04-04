import { Typography } from 'antd';
import get from 'api/channels/get';
import Spinner from 'components/Spinner';
import { SlackChannel } from 'container/CreateAlertChannels/config';
import EditAlertChannels from 'container/EditAlertChannels';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { useParams } from 'react-router-dom';
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

	const channel: SlackChannel = value.slack_configs[0];

	return (
		<EditAlertChannels
			{...{
				initialValue: {
					...channel,
					type: 'slack',
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
