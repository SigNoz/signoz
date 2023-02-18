import {
	Avatar,
	Button,
	Divider,
	Form,
	Input,
	Modal,
	Select as DefaultSelect,
} from 'antd';
import { themeColors } from 'constants/theme';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';

import { ActionType } from '../../Layouts';
import { ProcessorColumn } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getRecordIndex } from '../utils';
import { processorInputField, processorTypes, wrapperStyle } from './config';
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
	const isEdit = useMemo(() => isActionType === 'edit-processor', [
		isActionType,
	]);
	const isAdd = useMemo(() => isActionType === 'add-processor', [isActionType]);

	const onFinish = (values: OnFinishValue): void => {
		const newProcessorData: ProcessorColumn = {
			id: isEdit ? selectedProcessorData?.id : uuid(),
			text: values.name,
		};

		if (isEdit) {
			const findRecordIndex = getRecordIndex(
				processorDataSource,
				selectedProcessorData,
				'text' as never,
			);

			const updatedProcessorData = {
				...processorDataSource?.[findRecordIndex],
				text: values.name,
			};

			const editedData = processorDataSource?.map((data) =>
				data.text === selectedProcessorData?.text ? updatedProcessorData : data,
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
						? `${t('edit_processor')} ${selectedProcessorData?.text}`
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
				initialValues={selectedProcessorData}
				layout="vertical"
				style={{ marginTop: '1.25rem' }}
				onFinish={onFinish}
				autoComplete="off"
				form={form}
			>
				<div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
					<PipelineIndexIcon size="small">1</PipelineIndexIcon>
					<ProcessorTypeWrapper>
						<span>{t('processor_type')}</span>
						<DefaultSelect
							labelInValue
							style={{ width: 200 }}
							defaultValue={processorTypes[0]}
						>
							{processorTypes.map(({ value, label }) => (
								<DefaultSelect.Option key={value + label} value={value}>
									{label}
								</DefaultSelect.Option>
							))}
						</DefaultSelect>
					</ProcessorTypeWrapper>
				</div>
				{processorInputField.map((i, index) => {
					if (i.id === 1) {
						return (
							<div key={i.id} style={wrapperStyle}>
								<Avatar size="small" style={{ background: themeColors.navyBlue }}>
									{index + 2}
								</Avatar>
								<div style={{ width: '100%' }}>
									<Form.Item
										required={false}
										label={<ModalFooterTitle>{i.fieldName}</ModalFooterTitle>}
										name={i.name}
										key={i.id}
										rules={[
											{
												required: true,
											},
										]}
									>
										<Input placeholder={i.placeholder} name={i.name} />
									</Form.Item>
								</div>
							</div>
						);
					}
					return (
						<div key={i.id} style={wrapperStyle}>
							<Avatar size="small" style={{ background: themeColors.navyBlue }}>
								{index + 2}
							</Avatar>
							<div style={{ width: '100%' }}>
								<Form.Item
									name={i.name}
									label={<ModalFooterTitle>{i.fieldName}</ModalFooterTitle>}
								>
									<Input.TextArea rows={4} placeholder={i.placeholder} />
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
	name: string;
	id: number | boolean;
	text: string;
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
