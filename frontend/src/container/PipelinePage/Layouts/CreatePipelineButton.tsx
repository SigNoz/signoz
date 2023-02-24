import { EditFilled, PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { pipelineMockData } from '../mocks/pipeline';
import { ButtonContainer, CustomButton } from '../styles';
import { ActionMode, ActionType } from '.';

function CreatePipelineButton({
	setActionType,
	isActionMode,
	setActionMode,
}: CreatePipelineButtonProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const isAddNewPipelineVisible = useMemo(() => pipelineMockData.length > 0, []);

	const onClickHandler = useCallback(() => {
		setActionType(ActionType.AddPipeline);
	}, [setActionType]);

	const onEditModeHandler = useCallback(() => {
		setActionMode(ActionMode.Editing);
	}, [setActionMode]);

	return (
		<ButtonContainer>
			<TextToolTip text={t('add_new_pipeline')} />
			<CustomButton
				icon={<EditFilled />}
				onClick={onEditModeHandler}
				disabled={isActionMode === ActionMode.Editing}
			>
				{t('enter_edit_mode')}
			</CustomButton>
			{!isAddNewPipelineVisible && (
				<CustomButton
					icon={<PlusOutlined />}
					onClick={onClickHandler}
					type="primary"
				>
					{t('new_pipeline')}
				</CustomButton>
			)}
		</ButtonContainer>
	);
}

interface CreatePipelineButtonProps {
	setActionType: (actionType?: ActionType) => void;
	isActionMode: string;
	setActionMode: (actionMode: ActionMode) => void;
}

export default CreatePipelineButton;
