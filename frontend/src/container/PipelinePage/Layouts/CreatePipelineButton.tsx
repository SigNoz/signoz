import { EditFilled, PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PipelineResponse } from 'types/api/pipeline/def';

import { ButtonContainer, CustomButton } from '../styles';
import { ActionMode, ActionType } from '.';

function CreatePipelineButton({
	setActionType,
	isActionMode,
	setActionMode,
	piplineData,
}: CreatePipelineButtonProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const isAddNewPipelineVisible = useMemo(
		() => piplineData.pipelines.length > 0,
		[piplineData.pipelines.length],
	);
	const isDisabled = useMemo(() => isActionMode === ActionMode.Editing, [
		isActionMode,
	]);

	const actionHandler = useCallback(
		(functionToExecute: Dispatch<SetStateAction<string>>) => (): void => {
			functionToExecute((state) => state);
		},
		[],
	);

	return (
		<ButtonContainer>
			<TextToolTip text={t('add_new_pipeline')} />
			<CustomButton
				icon={<EditFilled />}
				onClick={actionHandler(() => setActionMode(ActionMode.Editing))}
				disabled={isDisabled}
			>
				{t('enter_edit_mode')}
			</CustomButton>
			{!isAddNewPipelineVisible && (
				<CustomButton
					icon={<PlusOutlined />}
					onClick={actionHandler(() => setActionType(ActionType.AddPipeline))}
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
	piplineData: PipelineResponse;
}

export default CreatePipelineButton;
