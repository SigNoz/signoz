import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ButtonContainer } from './styles';

function AddNewPipline({ setActionType }: AddNewPiplineType): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	return (
		<ButtonContainer>
			<TextToolTip text="Add Piplines" />
			<Button
				icon={<PlusOutlined />}
				onClick={(): void => setActionType('add-pipeline')}
				type="primary"
			>
				{t('new_pipeline')}
			</Button>
		</ButtonContainer>
	);
}

interface AddNewPiplineType {
	setActionType: (b?: string) => void;
}

export default AddNewPipline;
