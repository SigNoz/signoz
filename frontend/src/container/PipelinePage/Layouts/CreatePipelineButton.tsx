import { PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { AddPipelineButton, ButtonContainer } from '../styles';
import { ActionType } from '.';

function CreatePipelineButton({
	setActionType,
}: CreatePipelineButtonProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const onClickHandler = useCallback(() => {
		setActionType(ActionType.AddPipeline);
	}, [setActionType]);

	return (
		<ButtonContainer>
			<TextToolTip text={t('add_new_pipeline')} />
			<AddPipelineButton
				icon={<PlusOutlined />}
				onClick={onClickHandler}
				type="primary"
			>
				{t('new_pipeline')}
			</AddPipelineButton>
		</ButtonContainer>
	);
}

interface CreatePipelineButtonProps {
	setActionType: (actionType?: ActionType) => void;
}

export default CreatePipelineButton;
