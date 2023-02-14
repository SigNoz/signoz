import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ButtonContainer } from './styles';

function AddPipelineButton({
	setActionType,
}: AddPipelineButtonType): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const onClickHandler = (): void => {
		setActionType('add-pipeline');
	};

	return (
		<ButtonContainer>
			<TextToolTip text={t('add_new_pipeline')} />
			<Button icon={<PlusOutlined />} onClick={onClickHandler} type="primary">
				{t('new_pipeline')}
			</Button>
		</ButtonContainer>
	);
}

interface AddPipelineButtonType {
	setActionType: (b?: string) => void;
}

export default AddPipelineButton;
