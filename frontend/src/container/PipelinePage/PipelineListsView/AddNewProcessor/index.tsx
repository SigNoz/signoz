import { Button, Divider, Form, Modal } from 'antd';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionType } from '../../Layouts';
import { ProcessorColumn } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getEditedDataSource, getRecordIndex } from '../utils';
import { DEFAULT_PROCESSOR_TYPE } from './config';
import TypeSelect from './FormFields/TypeSelect';
import { renderProcessorForm } from './utils';

function AddNewProcessor({
	isActionType,
	setActionType,
	selectedProcessorData,
	processorDataSource,
	setProcessorDataSource,
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

	const handleProcessorType = (type: string): void => {
		setProcessorType(type);
	};

	const onFinish = (values: ProcessorColumn): void => {
		const newProcessorData: ProcessorColumn = {
			id: processorDataSource.length + 1,
			type: processorType,
			processorName: values.processorName,
			description: values.description,
		};

		if (isEdit) {
			const findRecordIndex = getRecordIndex(
				processorDataSource,
				selectedProcessorData,
				'text' as never,
			);

			const updatedProcessorData = {
				...processorDataSource?.[findRecordIndex],
				type: processorType,
				processorName: values.processorName,
				description: values.description,
			};

			const editedData = getEditedDataSource(
				processorDataSource,
				selectedProcessorData,
				'processorName' as never,
				updatedProcessorData,
			);

			setProcessorDataSource(editedData as Array<ProcessorColumn>);
		} else {
			setProcessorDataSource(
				(prevState: ProcessorColumn[]) =>
					[...prevState, newProcessorData] as ProcessorColumn[],
			);
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
				initialValues={isEdit ? selectedProcessorData : {}}
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
						<Button key="submit" type="primary" htmlType="submit">
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
	processorDataSource: Array<ProcessorColumn>;
	setProcessorDataSource: React.Dispatch<
		React.SetStateAction<Array<ProcessorColumn>>
	>;
	selectedProcessorData: ProcessorColumn | undefined;
}

export default AddNewProcessor;
