import { PlusOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import getAll from 'api/channels/getAll';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import useFetch from 'hooks/useFetch';
import history from 'lib/history';
import React, { useCallback } from 'react';

import AlertChannlesComponent from './AlertChannels';
import { ButtonContainer } from './styles';

const AlertChannels = (): JSX.Element => {
	const onToggleHandler = useCallback(() => {
		history.push(ROUTES.CHANNELS_NEW);
	}, []);

	const { loading, payload, error, errorMessage } = useFetch(getAll);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || payload === undefined) {
		return <Spinner tip="Loading Channels.." height={'90vh'} />;
	}

	return (
		<>
			<ButtonContainer>
				<Button onClick={onToggleHandler} icon={<PlusOutlined />}>
					New Alert Channel
				</Button>
			</ButtonContainer>

			<AlertChannlesComponent allChannels={payload} />
		</>
	);
};

export default AlertChannels;
