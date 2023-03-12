import { Button, Divider, Form, Modal } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';

import { ActionMode, ActionType } from '../../Layouts';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getEditedDataSource, getRecordIndex } from '../utils';
import { DEFAULT_PROCESSOR_TYPE } from './config';
import TypeSelect from './FormFields/TypeSelect';
import { renderProcessorForm } from './utils';

function AddNewProcessor({
	isActionType,
	setActionType,
	selectedProcessorData,
	setShowSaveButton,
	expandedPipelineData,
	setExpandedPipelineData,
}: AddNewProcessorProps): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation('pipeline');
	const [processorType, setProcessorType] = useState<string>(
		DEFAULT_PROCESSOR_TYPE,
	);

	const isEdit = useMemo(() => isActionType === 'edit-processor', [
		isActionType,
	]);
	const isAdd = useMemo(() => isActionType === 'add-processor', [isActionType]);

	useEffect(() => {
		if (isEdit) {
			form.setFieldsValue(selectedProcessorData);
		}
		if (isAdd) {
			form.resetFields();
		}
	}, [form, isEdit, isAdd, selectedProcessorData]);

	const handleProcessorType = (value: string | unknown): void => {
		const typedValue = String(value) || DEFAULT_PROCESSOR_TYPE;
		setProcessorType(typedValue);
	};

	const onFinish = (values: ProcessorData): void => {
		const totalDataLength = expandedPipelineData?.config?.length;
		const newProcessorData: ProcessorData = {
			orderId: Number(totalDataLength || 0) + 1,
			type: processorType,
			name: values.name,
			output: values.output,
		};

		if (isEdit && selectedProcessorData && expandedPipelineData?.config) {
			const findRecordIndex = getRecordIndex(
				expandedPipelineData?.config,
				selectedProcessorData,
				'id',
			);

			const updatedProcessorData = {
				...expandedPipelineData?.config?.[findRecordIndex],
				type: processorType,
				name: values.name,
				output: values.output,
			};

			const editedData = getEditedDataSource(
				expandedPipelineData.config,
				selectedProcessorData,
				'name',
				updatedProcessorData,
			);

			const modifiedProcessorData = { ...expandedPipelineData };

			modifiedProcessorData.config = editedData;

			setExpandedPipelineData(modifiedProcessorData);
		}
		if (isAdd && expandedPipelineData) {
			const modifiedProcessorData = {
				...expandedPipelineData,
			};
			if (modifiedProcessorData.config !== undefined) {
				modifiedProcessorData.config = [
					...modifiedProcessorData.config,
					newProcessorData,
				];
			}
			setExpandedPipelineData(modifiedProcessorData);
		}
		setActionType(undefined);
	};

	const onCancelModal = (): void => {
		setActionType(undefined);
	};

	const modalTitle = useMemo(
		(): string =>
			isEdit
				? `${t('edit_processor')} ${selectedProcessorData?.name}`
				: t('create_processor'),
		[isEdit, selectedProcessorData?.name, t],
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
			onCancel={onCancelModal}
		>
			<Divider plain />
			<Form
				name="add-new-processor"
				layout="vertical"
				style={{ marginTop: '1.25rem' }}
				onFinish={onFinish}
				autoComplete="off"
				form={form}
			>
				<TypeSelect
					value={isEdit ? selectedProcessorData?.type : processorType}
					onChange={handleProcessorType}
				/>
				{renderProcessorForm()}
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
						<Button key="cancel" onClick={onCancelModal}>
							{t('cancel')}
						</Button>
					</ModalButtonWrapper>
				</Form.Item>
			</Form>
		</Modal>
	);
}

interface AddNewProcessorProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	selectedProcessorData?: ProcessorData;
	setShowSaveButton: (actionMode: ActionMode) => void;
	expandedPipelineData: PipelineData | undefined;
	setExpandedPipelineData: (data: PipelineData) => void;
}

AddNewProcessor.defaultProps = {
	selectedProcessorData: undefined,
};

export default AddNewProcessor;
