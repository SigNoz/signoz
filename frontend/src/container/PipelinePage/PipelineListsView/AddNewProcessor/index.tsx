import {
	Avatar,
	Button,
	Divider,
	Form,
	Input,
	Modal,
	Select as DefaultSelect,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { themeColors } from 'constants/theme';
import { ModalFooterTitle } from 'container/PipelinePage/styles';
import React, { RefObject, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';

import { ActionType } from '../../Layouts';
import { SubPiplineColums } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { processorInputField, processorTypes, wrapperStyle } from './config';
import { PipelineIndexIcon, ProcessorTypeWrapper } from './styles';

function AddNewProcessor({
	isActionType,
	setActionType,
	selectedProcessorData,
	setChildDataSource,
	formRef,
	handleModalCancelAction,
	childDataSource,
}: AddNewProcessorProps): JSX.Element {
	const { Option } = DefaultSelect;
	const [form] = Form.useForm();
	const { t } = useTranslation(['pipeline', 'common']);
	const isEdit = useMemo(() => isActionType === 'edit-processor', [
		isActionType,
	]);
	const isAdd = useMemo(() => isActionType === 'add-processor', [isActionType]);

	useEffect(() => {
		if (isEdit) {
			form.setFieldsValue({
				name: selectedProcessorData?.text,
			});
		}
	}, [form, isEdit, selectedProcessorData]);

	const onFinish = (values: OnFinishValue): void => {
		const newProcessorData: SubPiplineColums = {
			id: isEdit ? selectedProcessorData?.id : uuid(),
			text: values.name,
		};

		if (isEdit) {
			const findRecordIndex = childDataSource?.findIndex(
				(i) => i.text === selectedProcessorData?.text,
			);

			const updatedProcessorData = {
				...childDataSource?.[findRecordIndex],
				text: values.name,
			};

			const editedData = childDataSource?.map((data) =>
				data.text === selectedProcessorData?.text ? updatedProcessorData : data,
			);

			setChildDataSource(editedData);
		} else {
			setChildDataSource(
				(prevState: SubPiplineColums[]) =>
					[...prevState, newProcessorData] as SubPiplineColums[],
			);
			formRef?.current?.resetFields();
		}
		setActionType(undefined);
	};

	const onCancelHandler = (): void => {
		setActionType(undefined);
		formRef?.current?.resetFields();
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
			<div style={{ marginTop: '1.25rem' }}>
				<div style={{ display: 'flex', gap: '1.25rem' }}>
					<PipelineIndexIcon size="small">1</PipelineIndexIcon>
					<ProcessorTypeWrapper>
						<span>{t('processor_type')}</span>
						<DefaultSelect
							labelInValue
							style={{ width: 200 }}
							defaultValue={processorTypes[0]}
						>
							{processorTypes.map(({ value, label }) => (
								<Option key={value + label} value={value}>
									{label}
								</Option>
							))}
						</DefaultSelect>
					</ProcessorTypeWrapper>
				</div>
				<Form
					form={form}
					layout="vertical"
					style={{ marginTop: '1.25rem' }}
					onFinish={onFinish}
					ref={formRef}
				>
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
							<Button key="cancel" onClick={handleModalCancelAction}>
								{t('cancel')}
							</Button>
						</ModalButtonWrapper>
					</Form.Item>
				</Form>
			</div>
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
	setChildDataSource: React.Dispatch<
		React.SetStateAction<Array<SubPiplineColums>>
	>;
	formRef: RefObject<FormInstance>;
	handleModalCancelAction: VoidFunction;
	childDataSource: Array<SubPiplineColums>;
	selectedProcessorData: SubPiplineColums | undefined;
}
export default AddNewProcessor;
