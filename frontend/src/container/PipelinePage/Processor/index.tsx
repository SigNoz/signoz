import {
	Avatar,
	Button,
	Divider,
	Form,
	Input,
	Modal,
	Select as DefaultSelect,
	Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { themeColors } from 'constants/theme';
import React, { RefObject, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { modalIcon } from '../config';
import { SubPiplineColumsType } from '../ListOfPipelines';
import { ModalFooterTitle } from '../styles';
import { wrapperStyle } from './config';
import { items, processorInputField } from './utils';

function NewProcessor({
	isActionType,
	setActionType,
	selectedProcessorData,
	setChildDataSource,
	formRef,
	handleModalCancelAction,
	childDataSource,
}: {
	isActionType: string | undefined;
	setActionType: (b: string | undefined) => void;
	setChildDataSource: (
		value:
			| React.SetStateAction<Array<SubPiplineColumsType>>
			| (() => Array<SubPiplineColumsType>),
	) => void;
	formRef: RefObject<FormInstance>;
	handleModalCancelAction: () => void;
	childDataSource: Array<SubPiplineColumsType>;
	selectedProcessorData: SubPiplineColumsType | undefined;
}): JSX.Element {
	const { Option } = DefaultSelect;
	const [form] = Form.useForm();
	const { t } = useTranslation(['common']);
	const isEdit = useMemo(() => isActionType === 'edit-processor', [
		isActionType,
	]);
	const isAdd = useMemo(() => isActionType === 'add-processor', [isActionType]);

	useEffect(() => {
		if (isEdit === true) {
			form.setFieldsValue({
				name: selectedProcessorData?.text,
			});
		}
	}, [form, isEdit, selectedProcessorData]);

	const onFinish = (values: OnFinishValueType): void => {
		const newProcessorData: SubPiplineColumsType = {
			id: isEdit === true ? isEdit : Math.random(),
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
				(prevState: SubPiplineColumsType[]) =>
					[...prevState, newProcessorData] as SubPiplineColumsType[],
			);
			formRef?.current?.resetFields();
		}
		setActionType(undefined);
	};

	return (
		<Modal
			title={
				<Typography.Title
					level={4}
					style={{
						fontStyle: 'normal',
						fontWeight: 600,
						fontSize: '18px',
						lineHeight: '24px',
					}}
				>
					{isEdit
						? `${t('edit_processor')} ${selectedProcessorData?.text}`
						: t('create_processor')}
				</Typography.Title>
			}
			centered
			open={isEdit || isAdd}
			width={800}
			footer={null}
			onCancel={(): void => setActionType(undefined)}
		>
			<Divider plain />
			<div style={{ marginTop: '20px' }}>
				<div style={{ display: 'flex', gap: '20px' }}>
					<Avatar size="small" style={modalIcon}>
						1
					</Avatar>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '10px',
							marginTop: '10px',
						}}
					>
						<span>{t('processor_type')}</span>
						<DefaultSelect
							labelInValue
							style={{ width: 200 }}
							defaultValue={{ value: 'Grok Processor', label: 'Grok Processor' }}
						>
							{items.map(({ value, label }) => (
								<Option key={value + label} value={value}>
									{label}
								</Option>
							))}
						</DefaultSelect>
					</div>
				</div>
				<Form
					form={form}
					layout="vertical"
					style={{ marginTop: '20px' }}
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
						<div
							style={{ display: 'flex', flexDirection: 'row-reverse', gap: '10px' }}
						>
							<Button key="submit" type="primary" htmlType="submit">
								{isEdit ? t('update') : t('create')}
							</Button>
							<Button key="cancel" onClick={handleModalCancelAction}>
								{t('cancel')}
							</Button>
						</div>
					</Form.Item>
				</Form>
			</div>
		</Modal>
	);
}

export interface OnFinishValueType {
	name: string;
	id: number | boolean;
	text: string;
}

export default NewProcessor;
