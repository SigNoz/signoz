import { Button, Divider, Form, Input, Modal, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import React, { RefObject, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';

import TagInput from '../components/TagInput';
import { ActionType } from '../Layouts';
import PiplinesSearchSection from '../Layouts/PiplinesSearchSection';
import { PipelineColumn } from '.';
import { addPipelinefieldLists } from './config';
import { FormLabelStyle } from './styles';

function AddNewPipline({
	isActionType,
	setActionType,
	selectedRecord,
	setDataSource,
	formRef,
	handleModalCancelAction,
	dataSource,
}: AddNewPiplineProps): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation(['pipeline', 'common']);
	const [count, setCount] = useState(3);
	const [tagsListData, setTagsListData] = useState<PipelineColumn['tags']>();

	const isEdit = useMemo(() => isActionType === 'edit-pipeline', [isActionType]);
	const isAdd = useMemo(() => isActionType === 'add-pipeline', [isActionType]);

	useEffect(() => {
		if (isEdit) {
			form.setFieldsValue({
				name: selectedRecord?.name,
				tags: selectedRecord?.tags,
			});
			setTagsListData(selectedRecord?.tags);
		} else {
			setTagsListData([]);
		}
	}, [form, isEdit, selectedRecord?.name, selectedRecord?.tags]);

	const onFinish = (values: PipelineColumn): void => {
		const operatorsData = Array({
			name: values.operators,
		});

		const newData = {
			orderid: count.toString(),
			key: uuid(),
			editedBy: '',
			filter: '',
			lastEdited: new Date().toDateString(),
			name: values.name,
			tags: tagsListData,
			operators: operatorsData,
		};

		if (isEdit) {
			const findRecordIndex = dataSource.findIndex(
				(i) => i.name === selectedRecord?.name,
			);
			const updatedPipelineData = {
				...dataSource[findRecordIndex],
				name: values.name,
				tags: tagsListData,
			};

			const tempData = dataSource?.map((data) =>
				data.name === selectedRecord?.name ? updatedPipelineData : data,
			);
			setDataSource(tempData as Array<PipelineColumn>);
			formRef?.current?.resetFields();
		} else {
			setTagsListData([]);
			setCount((prevState: number) => (prevState + 1) as number);
			setDataSource(
				(pre: PipelineColumn[]) => [...pre, newData] as PipelineColumn[],
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
				<Typography.Title
					level={4}
					style={{
						fontStyle: 'normal',
						fontWeight: 600,
						fontSize: '1.125rem',
						lineHeight: '1.5rem',
					}}
				>
					{isEdit
						? `${t('edit_pipeline')} : ${selectedRecord?.name}`
						: t('create_pipeline')}
				</Typography.Title>
			}
			centered
			open={isEdit || isAdd}
			width={800}
			footer={null}
			onCancel={onCancelHandler}
		>
			<Divider plain />
			<div style={{ marginTop: '1.563rem' }}>
				<span>{t('filter')}</span>
				<div style={{ marginTop: '0.313rem' }}>
					<PiplinesSearchSection />
				</div>
			</div>
			<Form
				form={form}
				layout="vertical"
				style={{ marginTop: '1.25rem' }}
				onFinish={onFinish}
				ref={formRef}
			>
				{addPipelinefieldLists.map((i) => {
					if (i.id === 3) {
						return (
							<Form.Item
								required={false}
								name={i.name}
								label={i.fieldName}
								key={i.id}
								rules={[
									{
										required: true,
									},
								]}
							>
								<Input.TextArea
									rows={3}
									name={i.fieldName}
									placeholder={
										isEdit
											? `This is a pipeline to edit ${selectedRecord?.name}`
											: i.placeholder
									}
								/>
							</Form.Item>
						);
					}
					if (i.id === 2) {
						return (
							<Form.Item
								required={false}
								label={<FormLabelStyle>{i.fieldName}</FormLabelStyle>}
								key={i.id}
								name={i.name}
							>
								<TagInput
									setTagsListData={setTagsListData}
									tagsListData={tagsListData as []}
									placeHolder={i.fieldName}
								/>
							</Form.Item>
						);
					}
					return (
						<Form.Item
							required={false}
							label={<FormLabelStyle>{i.fieldName}</FormLabelStyle>}
							key={i.id}
							rules={[
								{
									required: true,
								},
							]}
							name={i.name}
						>
							<Input name={i.fieldName} placeholder={i.placeholder} />
						</Form.Item>
					);
				})}
				<Divider plain />
				<Form.Item>
					<div
						style={{ display: 'flex', flexDirection: 'row-reverse', gap: '0.625rem' }}
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
		</Modal>
	);
}

interface AddNewPiplineProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	selectedRecord: PipelineColumn | undefined;
	setDataSource: (value: React.SetStateAction<Array<PipelineColumn>>) => void;
	formRef: RefObject<FormInstance>;
	handleModalCancelAction: VoidFunction;
	dataSource: Array<PipelineColumn>;
}

export default AddNewPipline;
