import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React from 'react';

import { Button, ButtonContainer } from './styles';

function AddNewPipline() {
	return (
		<ButtonContainer>
			<TextToolTip
				{...{
					text: `add Piplines`,
				}}
			/>
			<Button
				icon={<PlusOutlined />}
				onClick={() => alert('Working')}
				type="primary"
			>
				New Pipeline
			</Button>
		</ButtonContainer>
	);
}

export default AddNewPipline;
