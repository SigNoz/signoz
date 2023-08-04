import { EditFilled, PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMode, ActionType, Pipeline } from 'types/api/pipeline/def';

import { ButtonContainer, CustomButton } from '../../styles';
import { checkDataLength } from '../utils';

function CreatePipelineButton({
	setActionType,
	isActionMode,
	setActionMode,
	piplineData,
}: CreatePipelineButtonProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);

	const isAddNewPipelineVisible = useMemo(
		() => checkDataLength(piplineData?.pipelines),
		[piplineData?.pipelines],
	);
	const isDisabled = isActionMode === ActionMode.Editing;

	const actionHandler = useCallback(
		(action: string, setStateFunc: (action: string) => void) => (): void =>
			setStateFunc(action),
		[],
	);

	return (
		<ButtonContainer>
			<TextToolTip text={t('add_new_pipeline')} />
			{isAddNewPipelineVisible && (
				<CustomButton
					icon={<EditFilled />}
					onClick={actionHandler(ActionMode.Editing, setActionMode)}
					disabled={isDisabled}
				>
					{t('enter_edit_mode')}
				</CustomButton>
			)}
			{!isAddNewPipelineVisible && (
				<CustomButton
					icon={<PlusOutlined />}
					onClick={actionHandler(ActionType.AddPipeline, setActionType)}
					type="primary"
				>
					{t('new_pipeline')}
				</CustomButton>
			)}
		</ButtonContainer>
	);
}

interface CreatePipelineButtonProps {
	setActionType: (actionType: string) => void;
	isActionMode: string;
	setActionMode: (actionMode: string) => void;
	piplineData: Pipeline;
}

export default CreatePipelineButton;
