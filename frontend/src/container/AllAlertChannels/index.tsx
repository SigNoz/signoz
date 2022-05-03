import { PlusOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import getAll from 'api/channels/getAll';
import Spinner from 'components/Spinner';
import TextToolTip from 'components/TextToolTip';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import useFetch from 'hooks/useFetch';
import history from 'lib/history';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import AlertChannelsComponent from './AlertChannels';
import { Button, ButtonContainer } from './styles';

const { Paragraph } = Typography;

function AlertChannels(): JSX.Element {
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [addNewChannelPermission] = useComponentPermission(
		['add_new_channel'],
		role,
	);
	const onToggleHandler = useCallback(() => {
		history.push(ROUTES.CHANNELS_NEW);
	}, []);

	const { loading, payload, error, errorMessage } = useFetch(getAll);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || payload === undefined) {
		return <Spinner tip="Loading Channels.." height="90vh" />;
	}

	return (
		<>
			<ButtonContainer>
				<Paragraph ellipsis type="secondary">
					The latest added channel is used as the default channel for sending alerts
				</Paragraph>

				<div>
					<TextToolTip
						text="More details on how to setting notification channels"
						url="https://signoz.io/docs/userguide/alerts-management/#setting-notification-channel"
					/>

					{addNewChannelPermission && (
						<Button onClick={onToggleHandler} icon={<PlusOutlined />}>
							New Alert Channel
						</Button>
					)}
				</div>
			</ButtonContainer>

			<AlertChannelsComponent allChannels={payload} />
		</>
	);
}

export default AlertChannels;
