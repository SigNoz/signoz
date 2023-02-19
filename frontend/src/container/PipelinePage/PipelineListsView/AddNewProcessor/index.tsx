import { Avatar, Button, Divider, Form, Input, Modal, Select } from 'antd';
import { themeColors } from 'constants/theme';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionType } from '../../Layouts';
import { ProcessorColumn } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getRecordIndex } from '../utils';
import {
	DEFAULT_PROCESSOR_TYPE,
	processorInputField,
	processorTypes,
	wrapperStyle,
} from './config';
import { PipelineIndexIcon, ProcessorTypeWrapper } from './styles';

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

	const onFinish = (values: OnFinishValue): void => {
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

			const editedData = processorDataSource?.map((data) =>
				data.processorName === selectedProcessorData?.processorName
					? updatedProcessorData
					: data,
			);

			setProcessorDataSource(editedData);
		} else {
			setProcessorDataSource(
				(prevState: ProcessorColumn[]) =>
					[...prevState, newProcessorData] as ProcessorColumn[],
			);
			form.resetFields();
		}
		setActionType(undefined);
	};

	const onCancelHandler = (): void => {
		setActionType(undefined);
		form.resetFields();
	};

	return (
		<Modal
			title={
				<ModalTitle level={4}>
					{isEdit
						? `${t('edit_processor')} ${selectedProcessorData?.processorName}`
						: t('create_processor')}
				</ModalTitle>
			}
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
				<div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
					<PipelineIndexIcon size="small">1</PipelineIndexIcon>
					<ProcessorTypeWrapper>
						<span>{t('processor_type')}</span>
						<Select
							style={{ width: 200 }}
							onChange={handleProcessorType}
							defaultValue={isEdit ? selectedProcessorData?.type : processorType}
						>
							{processorTypes.map(({ value, label }) => (
								<Select.Option key={value + label} value={value}>
									{label}
								</Select.Option>
							))}
						</Select>
					</ProcessorTypeWrapper>
				</div>
				{processorInputField.map((item, index) => {
					if (item.id === '1') {
						return (
							<div key={item.id} style={wrapperStyle}>
								<Avatar size="small" style={{ background: themeColors.navyBlue }}>
									{index + 2}
								</Avatar>
								<div style={{ width: '100%' }}>
									<Form.Item
										required={false}
										label={<ModalFooterTitle>{item.fieldName}</ModalFooterTitle>}
										key={item.id}
										name={item.name}
										rules={[
											{
												required: true,
											},
										]}
									>
										<Input placeholder={t(t(item.placeholder))} name={item.name} />
									</Form.Item>
								</div>
							</div>
						);
					}
					return (
						<div key={item.id} style={wrapperStyle}>
							<Avatar size="small" style={{ background: themeColors.navyBlue }}>
								{index + 2}
							</Avatar>
							<div style={{ width: '100%' }}>
								<Form.Item
									name={item.name}
									label={<ModalFooterTitle>{item.fieldName}</ModalFooterTitle>}
								>
									<Input.TextArea
										rows={4}
										name={item.name}
										placeholder={t(t(item.placeholder))}
									/>
								</Form.Item>
							</div>
						</div>
					);
				})}
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

export interface OnFinishValue {
	processorName: string;
	description: string;
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
