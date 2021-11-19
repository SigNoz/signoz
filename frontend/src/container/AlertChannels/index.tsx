import { PlusOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import getAll from 'api/channels/getAll';
import Spinner from 'components/Spinner';
import useFetch from 'hooks/useFetch';
import React, { useCallback, useState } from 'react';

import AlertChannlesComponent from './AlertChannels';
import CreateAlertChannels from './CreateAlertChannels';
import { ButtonContainer } from './styles';

const AlertChannels = (): JSX.Element => {
	const [isNewAlert, setIsNewAlert] = useState<boolean>(false);

	const onToggleHandler = useCallback(() => {
		setIsNewAlert((state) => !state);
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
			{!isNewAlert && (
				<ButtonContainer>
					<Button onClick={onToggleHandler} icon={<PlusOutlined />}>
						New Alert Channel
					</Button>
				</ButtonContainer>
			)}

			{isNewAlert ? (
				<CreateAlertChannels onToggleHandler={onToggleHandler} />
			) : (
				<AlertChannlesComponent allChannels={payload} />
			)}
		</>
	);
};

export default AlertChannels;
