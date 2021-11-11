import React, { useCallback, useState } from 'react';
import { ButtonContainer } from './styles';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AlertChannlesComponent from './AlertChannels';
import CreateAlertChannels from './CreateAlertChannels';

const AlertChannels = () => {
	const [isNewAlert, setIsNewAlert] = useState<boolean>(true);

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
