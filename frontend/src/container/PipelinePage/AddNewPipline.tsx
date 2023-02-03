import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React, { useState } from 'react';

import NewPipline from './NewPipeline';
import { Button, ButtonContainer } from './styles';

function AddNewPipline(): JSX.Element {
	const [addPipeline, setNewAddPiplines] = useState<boolean>(false);

	return (
		<ButtonContainer>
			<TextToolTip text="add Piplines" />
			{addPipeline && (
				<NewPipline
					addPipeline={addPipeline}
					setNewAddPiplines={setNewAddPiplines}
				/>
			)}
			<Button
				icon={<PlusOutlined />}
				onClick={(): void => setNewAddPiplines(true)}
				type="primary"
			>
				New Pipeline
			</Button>
		</ButtonContainer>
	);
}

export default AddNewPipline;
