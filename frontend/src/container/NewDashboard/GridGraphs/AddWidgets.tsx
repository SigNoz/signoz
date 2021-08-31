import { PlusOutlined } from '@ant-design/icons';
import { Col, Typography } from 'antd';
import React, { useCallback } from 'react';

import { Card, CardContainer } from './styles';

const AddWidgets = ({ setIsAddWidgets }: AddWidgetsProps): JSX.Element => {
	const onClickHandler = useCallback(() => {
		setIsAddWidgets((value) => !value);
	}, []);

	return (
		<CardContainer>
			<Col md={6} lg={6}>
				<Card onClick={onClickHandler}>
					<PlusOutlined />
					<Typography>Add Widgets</Typography>
				</Card>
			</Col>
		</CardContainer>
	);
};

interface AddWidgetsProps {
	setIsAddWidgets: React.Dispatch<React.SetStateAction<boolean>>;
}

export default AddWidgets;
