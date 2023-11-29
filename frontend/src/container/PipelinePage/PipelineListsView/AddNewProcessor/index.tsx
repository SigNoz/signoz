import { Button, Divider, Form, Modal } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	ActionMode,
	ActionType,
	PipelineData,
	ProcessorData,
} from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getEditedDataSource, getRecordIndex } from '../utils';
import { DEFAULT_PROCESSOR_TYPE, processorFields } from './config';
import TypeSelect from './FormFields/TypeSelect';
import ProcessorForm from './ProcessorForm';

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

	const isEdit = isActionType === 'edit-processor';
	const isAdd = isActionType === 'add-processor';

	useEffect(() => {
		if (isEdit && selectedProcessorData && expandedPipelineData?.config) {
			const findRecordIndex = getRecordIndex(
				expandedPipelineData?.config,
				selectedProcessorData,
				'id',
			);

			const updatedProcessorData = {
				...expandedPipelineData?.config?.[findRecordIndex],
			};
			setProcessorType(updatedProcessorData.type);
			form.setFieldsValue(updatedProcessorData);
		}
		if (isAdd) {
			form.resetFields();
		}
	}, [form, isEdit, isAdd, selectedProcessorData, expandedPipelineData?.config]);

	const handleProcessorType = (value: string | unknown): void => {
		const typedValue = String(value) || DEFAULT_PROCESSOR_TYPE;
		setProcessorType(typedValue);
	};

	const onFinish = (values: { name: string }): void => {
		const totalDataLength = expandedPipelineData?.config?.length || 0;

		const newProcessorData = {
			id: v4(),
			orderId: Number(totalDataLength || 0) + 1,
			type: processorType,
			enabled: true,
			...values,
		};

		if (isEdit && selectedProcessorData && expandedPipelineData?.config) {
			const findRecordIndex = getRecordIndex(
				expandedPipelineData?.config,
				selectedProcessorData,
				'id',
			);

			const processorData = expandedPipelineData?.config?.[findRecordIndex];

			const updatedProcessorData = {
				id: processorData?.id || v4(),
				orderId: processorData?.orderId,
				type: processorType,
				enabled: processorData?.enabled,
				output: processorData?.output,
				...values,
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
			if (
				modifiedProcessorData.config !== undefined &&
				modifiedProcessorData.config
			) {
				modifiedProcessorData.config = [
					...modifiedProcessorData.config,
					newProcessorData,
				];
				if (totalDataLength > 0) {
					modifiedProcessorData.config[totalDataLength - 1].output =
						newProcessorData.id;
				}
			}
			setExpandedPipelineData(modifiedProcessorData);
		}
		setActionType(undefined);
		handleProcessorType(DEFAULT_PROCESSOR_TYPE);
	};

	const onCancelModal = (): void => {
		setActionType(undefined);
		handleProcessorType(DEFAULT_PROCESSOR_TYPE);
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

	const onFormValuesChanged = useCallback(
		(changedValues: ProcessorData): void => {
			processorFields[processorType].forEach((field) => {
				if (field.onFormValuesChanged) {
					field.onFormValuesChanged(changedValues, form);
				}
			});
		},
		[form, processorType],
	);

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
				onFinish={onFinish}
				autoComplete="off"
				form={form}
				onValuesChange={onFormValuesChanged}
			>
				<TypeSelect value={processorType} onChange={handleProcessorType} />
				<ProcessorForm processorType={processorType} />
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

AddNewProcessor.defaultProps = {
	selectedProcessorData: undefined,
	expandedPipelineData: {},
};

interface AddNewProcessorProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	selectedProcessorData?: ProcessorData;
	setShowSaveButton: (actionMode: ActionMode) => void;
	expandedPipelineData?: PipelineData;
	setExpandedPipelineData: (data: PipelineData) => void;
}

export default AddNewProcessor;
