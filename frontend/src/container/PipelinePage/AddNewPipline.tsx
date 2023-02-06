import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React from 'react';

import { Button, ButtonContainer } from './styles';

function AddNewPipline({
	setActionType,
}: {
	setActionType: (b: string | undefined) => void;
}): JSX.Element {
	return (
		<ButtonContainer>
			<TextToolTip text="Add Piplines" />
			<Button
				icon={<PlusOutlined />}
				onClick={(): void => setActionType('add-pipeline')}
				type="primary"
			>
				New Pipeline
			</Button>
		</ButtonContainer>
	);
}

export default AddNewPipline;
