import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@signozhq/ui';
import { Form, FormInstance, Modal } from 'antd';
import { useAppContext } from 'providers/App/App';
import { ActionMode, ActionType, PipelineData } from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import { ModalButtonWrapper } from '../styles';
import { getEditedDataSource, getRecordIndex } from '../utils';
import { renderPipelineForm } from './utils';

function AddNewPipeline({
	form,
	isActionType,
	setActionType,
	selectedPipelineData,
	setShowSaveButton,
	setCurrPipelineData,
	currPipelineData,
}: AddNewPipelineProps): JSX.Element {
	const { t } = useTranslation('pipeline');
	const { user } = useAppContext();

	const isEdit = isActionType === 'edit-pipeline';
	const isAdd = isActionType === 'add-pipeline';

	const onFinish = (values: PipelineData): void => {
		const newPipeLineData: PipelineData = {
			id: v4(),
			orderId: (currPipelineData?.length || 0) + 1,
			createdAt: new Date().toISOString(),
			createdBy: user?.displayName || '',
			name: values.name,
			alias: values.name.replace(/\s/g, ''),
			description: values.description,
			filter: values.filter,
			config: [],
			enabled: true,
		};

		if (isEdit && selectedPipelineData) {
			const findRecordIndex = getRecordIndex(
				currPipelineData,
				selectedPipelineData,
				'id',
			);
			const updatedPipelineData: PipelineData = {
				...currPipelineData[findRecordIndex],
				...values,
			};

			const editedPipelineData = getEditedDataSource(
				currPipelineData,
				selectedPipelineData,
				'id',
				updatedPipelineData,
			);

			setCurrPipelineData(editedPipelineData);
		}
		if (isAdd) {
			setCurrPipelineData((prevState) => {
				if (prevState) {
					return [...prevState, newPipeLineData];
				}
				return [newPipeLineData];
			});
		}
		setActionType(undefined);
	};

	const onCancelModalHandler = (): void => {
		setActionType(undefined);
	};

	const modalTitle = useMemo(
		(): string =>
			isEdit
				? `${t('edit_pipeline')} : ${selectedPipelineData?.name}`
				: t('create_pipeline'),
		[isEdit, selectedPipelineData?.name, t],
	);

	const onOkModalHandler = useCallback(
		() => setShowSaveButton(ActionMode.Editing),
		[setShowSaveButton],
	);

	const isOpen = useMemo(() => isEdit || isAdd, [isAdd, isEdit]);

	return (
		<Modal
			title={modalTitle}
			centered
			open={isOpen}
			width={800}
			footer={null}
			onCancel={onCancelModalHandler}
		>
			<Form
				name="add-new-pipeline"
				layout="vertical"
				onFinish={onFinish}
				autoComplete="off"
				form={form}
				className="add-new-pipeline-form"
			>
				{renderPipelineForm()}

				<Form.Item>
					<ModalButtonWrapper>
						<Button
							key="submit"
							variant="solid"
							color="primary"
							onClick={onOkModalHandler}
						>
							{isEdit ? t('update') : t('create')}
						</Button>
						<Button
							key="cancel"
							variant="solid"
							color="secondary"
							onClick={onCancelModalHandler}
						>
							{t('cancel')}
						</Button>
					</ModalButtonWrapper>
				</Form.Item>
			</Form>
		</Modal>
	);
}

interface AddNewPipelineProps {
	form: FormInstance<PipelineData>;
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	selectedPipelineData: PipelineData | undefined;
	setShowSaveButton: (actionMode: ActionMode) => void;
	setCurrPipelineData: (
		value: React.SetStateAction<Array<PipelineData>>,
	) => void;
	currPipelineData: Array<PipelineData>;
}

export default AddNewPipeline;
