import { Button, Divider, Form, Modal } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { AddProcessorData, UpdateProcessorData } from 'store/actions';
import { AppState } from 'store/reducers';
import { PipelineReducerType } from 'store/reducers/pipeline';

import { ActionMode, ActionType } from '../../Layouts';
import { ProcessorColumn } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { DEFAULT_PROCESSOR_TYPE } from './config';
import TypeSelect from './FormFields/TypeSelect';
import { renderProcessorForm } from './utils';

function AddNewProcessor({
	isActionType,
	setActionType,
	selectedProcessorData,
	setIsVisibleSaveButton,
}: AddNewProcessorProps): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation('pipeline');
	const dispatch = useDispatch();
	const [processorType, setProcessorType] = useState<string>(
		DEFAULT_PROCESSOR_TYPE,
	);
	const { processorData } = useSelector<AppState, PipelineReducerType>(
		(state) => state.pipeline,
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
			id: processorData.length + 1,
			type: processorType,
			processorName: values.processorName,
			description: values.description,
			name: values.processorName,
		};

		if (isEdit) {
			dispatch(
				UpdateProcessorData(
					processorData,
					selectedProcessorData,
					values,
					processorType,
				),
			);
		} else {
			dispatch(AddProcessorData(newProcessorData as ProcessorColumn));
		}
		setActionType(undefined);
	};

	const onCancelHandler = (): void => {
		setActionType(undefined);
	};

	const modalTitle = useMemo(
		(): string =>
			isEdit
				? `${t('edit_processor')} ${selectedProcessorData?.processorName}`
				: t('create_processor'),
		[isEdit, selectedProcessorData?.processorName, t],
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
}

export default AddNewProcessor;
