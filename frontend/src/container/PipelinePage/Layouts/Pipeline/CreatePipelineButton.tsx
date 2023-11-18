import { EditFilled, PlusOutlined } from '@ant-design/icons';
import TextToolTip from 'components/TextToolTip';
import useAnalytics from 'hooks/analytics/useAnalytics';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMode, ActionType, Pipeline } from 'types/api/pipeline/def';

import { ButtonContainer, CustomButton } from '../../styles';
import { checkDataLength } from '../utils';

function CreatePipelineButton({
	setActionType,
	isActionMode,
	setActionMode,
	pipelineData,
}: CreatePipelineButtonProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const { trackEvent } = useAnalytics();

	const isAddNewPipelineVisible = useMemo(
		() => checkDataLength(pipelineData?.pipelines),
		[pipelineData?.pipelines],
	);
	const isDisabled = isActionMode === ActionMode.Editing;

	const onEnterEditMode = (): void => {
		setActionMode(ActionMode.Editing);

		trackEvent('Logs: Pipelines: Entered Edit Mode', {
			source: 'signoz-ui',
		});
	};
	const onAddNewPipeline = (): void => {
		setActionMode(ActionMode.Editing);
		setActionType(ActionType.AddPipeline);

		trackEvent('Logs: Pipelines: Clicked Add New Pipeline', {
			source: 'signoz-ui',
		});
	};

	return (
		<ButtonContainer>
			<TextToolTip
				text={t('learn_more')}
				url="https://signoz.io/docs/logs-pipelines/introduction/"
			/>
			{isAddNewPipelineVisible && (
				<CustomButton
					icon={<EditFilled />}
					onClick={onEnterEditMode}
					disabled={isDisabled}
				>
					{t('enter_edit_mode')}
				</CustomButton>
			)}
			{!isAddNewPipelineVisible && (
				<CustomButton
					icon={<PlusOutlined />}
					onClick={onAddNewPipeline}
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
	pipelineData: Pipeline;
}

export default CreatePipelineButton;
