import { PlusOutlined } from '@ant-design/icons';
import React from 'react';

import { Button, Container } from './styles';

const AddWidget = ({ onToggleHandler }: AddWidgetProps): JSX.Element => {
	return (
		<Container>
			<Button onClick={onToggleHandler} icon={<PlusOutlined />}>
				Add Widgets
			</Button>
		</Container>
	);
};

interface AddWidgetProps {
	onToggleHandler: () => void;
}

export default AddWidget;
