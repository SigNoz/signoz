import { Button, Divider, Form, Modal } from 'antd';
import { useAppContext } from 'providers/App/App';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionMode, ActionType, PipelineData } from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getEditedDataSource, getRecordIndex } from '../utils';
import { renderPipelineForm } from './utils';

function AddNewPipeline({
	isActionType,
	setActionType,
	selectedPipelineData,
	setShowSaveButton,
	setCurrPipelineData,
	currPipelineData,
}: AddNewPipelineProps): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation('pipeline');
	const { user } = useAppContext();

	const isEdit = isActionType === 'edit-pipeline';
	const isAdd = isActionType === 'add-pipeline';

	useEffect(() => {
		if (isEdit) {
			form.setFieldsValue(selectedPipelineData);
		}
		if (isAdd) {
			form.resetFields();
		}
	}, [form, isEdit, isAdd, selectedPipelineData]);

	const onFinish = (values: PipelineData): void => {
		const newPipeLineData: PipelineData = {
			id: v4(),
			orderId: (currPipelineData?.length || 0) + 1,
			createdAt: new Date().toISOString(),
			createdBy: user?.name || '',
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
				if (prevState) return [...prevState, newPipeLineData];
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
			title={<ModalTitle level={4}>{modalTitle}</ModalTitle>}
			centered
			open={isOpen}
			width={800}
			footer={null}
			onCancel={onCancelModalHandler}
		>
			<Divider plain />
			<Form
				name="add-new-pipeline"
				layout="vertical"
				onFinish={onFinish}
				autoComplete="off"
				form={form}
			>
				{renderPipelineForm()}
				<Divider plain />
				<Form.Item>
					<ModalButtonWrapper>
						<Button
							key="submit"
							type="primary"
							htmlType="submit"
							onClick={onOkModalHandler}
						>
							{isEdit ? t('update') : t('create')}
						</Button>
						<Button key="cancel" onClick={onCancelModalHandler}>
							{t('cancel')}
						</Button>
					</ModalButtonWrapper>
				</Form.Item>
			</Form>
		</Modal>
	);
}

interface AddNewPipelineProps {
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
