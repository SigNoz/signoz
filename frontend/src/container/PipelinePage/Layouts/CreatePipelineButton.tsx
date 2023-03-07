import { EditFilled, PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import React, { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
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
}

export default CreatePipelineButton;
