import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React, { useCallback, useState } from 'react';

import AlertChannlesComponent from './AlertChannels';
import CreateAlertChannels from './CreateAlertChannels';
import { ButtonContainer } from './styles';

const AlertChannels = (): JSX.Element => {
	const [isNewAlert, setIsNewAlert] = useState<boolean>(false);

	const onToggleHandler = useCallback(() => {
		setIsNewAlert((state) => !state);
	}, []);

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
				<AlertChannlesComponent />
			)}
		</>
	);
};

export default AlertChannels;
