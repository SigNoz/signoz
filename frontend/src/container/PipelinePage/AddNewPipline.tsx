import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React from 'react';

import { Button, ButtonContainer } from './styles';

function AddNewPipline(): JSX.Element {
	return (
		<ButtonContainer>
			<TextToolTip
				{...{
					text: `add Piplines`,
				}}
			/>
			<Button
				icon={<PlusOutlined />}
				onClick={(): void => console.log('New Pipeline')}
				type="primary"
			>
				New Pipeline
			</Button>
		</ButtonContainer>
	);
}

export default AddNewPipline;
