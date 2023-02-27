import { Button, Divider, Form, Modal } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionMode, ActionType } from '../../Layouts';
import { PipelineColumn, PipelineOperators, ProcessorColumn } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getEditedDataSource, getRecordIndex } from '../utils';
import { DEFAULT_PROCESSOR_TYPE } from './config';
import TypeSelect from './FormFields/TypeSelect';
import { renderProcessorForm } from './utils';

function AddNewProcessor({
	isActionType,
	setActionType,
	selectedProcessorData,
	setIsVisibleSaveButton,
	selectedPipelineDataState,
	setSelectedPipelineDataState,
	setCurrPipelineData,
	currPipelineData,
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
	}, [form, isEdit, selectedProcessorData]);

	const handleProcessorType = (type: string): void => {
		setProcessorType(type);
	};

	const onFinish = (values: ProcessorColumn): void => {
		const newProcessorData = {
			id: (selectedPipelineDataState.operators.length + 1).toString(),
			type: processorType,
			name: values.name,
			output: values.output,
		};

		if (isEdit) {
			const findRecordIndex = getRecordIndex(
				selectedPipelineDataState.operators,
				selectedProcessorData,
				'id' as never,
			);

			const updatedProcessorData = {
				...selectedPipelineDataState?.operators?.[findRecordIndex],
				type: processorType,
				name: values.name,
				output: values.output,
			};

			const editedData = getEditedDataSource(
				selectedPipelineDataState.operators,
				selectedProcessorData,
				'name' as never,
				updatedProcessorData,
			);
			const modifiedPipelineData = currPipelineData.map((item) => {
				const pipelineData = item;
				if (item.uuid === selectedPipelineDataState.uuid) {
					pipelineData.operators = editedData as PipelineOperators[];
				}
				return pipelineData;
			});
			const modifiedProcessorData = { ...selectedPipelineDataState };
			modifiedProcessorData.operators = editedData as PipelineOperators[];
			setSelectedPipelineDataState(modifiedProcessorData);
			setCurrPipelineData(modifiedPipelineData);
		} else {
			const modifiedPipelineData = currPipelineData.map((item: PipelineColumn) => {
				const pipelineData = item;
				if (item.uuid === selectedPipelineDataState.uuid) {
					pipelineData.operators.push(newProcessorData);
				}
				return pipelineData;
			});
			const modifiedProcessorData = { ...selectedPipelineDataState };
			modifiedProcessorData.operators.push(newProcessorData);
			setSelectedPipelineDataState(modifiedProcessorData);
			setCurrPipelineData(modifiedPipelineData);
		}
		setActionType(undefined);
	};

	const onCancelHandler = (): void => {
		setActionType(undefined);
	};

	const modalTitle = useMemo(
		(): string =>
			isEdit
				? `${t('edit_processor')} ${selectedProcessorData?.name}`
				: t('create_processor'),
		[isEdit, selectedProcessorData?.name, t],
	);

	const onClickHandler = useCallback(
		() => setIsVisibleSaveButton(ActionMode.Editing),
		[setIsVisibleSaveButton],
	);

	return (
		<Modal
			title={<ModalTitle level={4}>{modalTitle}</ModalTitle>}
			centered
			open={isEdit || isAdd}
			width={800}
			footer={null}
			onCancel={onCancelHandler}
		>
			<Divider plain />
			<Form
				name="addNewProcessor"
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
							onClick={onClickHandler}
						>
							{isEdit ? t('update') : t('create')}
						</Button>
						<Button key="cancel" onClick={onCancelHandler}>
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
	selectedProcessorData: ProcessorColumn | undefined;
	setIsVisibleSaveButton: (actionMode: ActionMode) => void;
	selectedPipelineDataState: PipelineColumn;
	setSelectedPipelineDataState: (data: PipelineColumn) => void;
	setCurrPipelineData: (
		value: React.SetStateAction<Array<PipelineColumn>>,
	) => void;
	currPipelineData: Array<PipelineColumn>;
}

export default AddNewProcessor;
