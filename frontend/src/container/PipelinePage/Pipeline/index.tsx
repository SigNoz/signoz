import { Button, Divider, Form, Input, Modal, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import React, { RefObject, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuid } from 'uuid';

import { PipelineColumnType } from '../ListOfPipelines';
import PiplinesSearchBar from '../SearchBar';
import { SpanStyle } from '../styles';
import TagSelect from './TagInput';
import { inputfieldName } from './utils';

function NewPipline({
	isActionType,
	setActionType,
	selectedRecord,
	setDataSource,
	formRef,
	handleModalCancelAction,
	dataSource,
}: NewPiplinePropsType): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation(['pipeline', 'common']);
	const [count, setCount] = useState(3);
	const [tagsListData, setTagsListData] = useState<PipelineColumnType['tags']>();

	const isEdit = useMemo(() => isActionType === 'edit-pipeline', [isActionType]);
	const isAdd = useMemo(() => isActionType === 'add-pipeline', [isActionType]);

	useEffect(() => {
		if (isEdit === true) {
			form.setFieldsValue({
				name: selectedRecord?.name,
				tags: tagsListData,
			});
		}
	}, [form, formRef, isEdit, selectedRecord?.name, tagsListData]);

	useEffect(() => {
		setTagsListData(selectedRecord?.tags);
	}, [selectedRecord?.tags]);

	const onFinish = (values: PipelineColumnType): void => {
		const operatorsData = Array({
			name: values.operators,
		});

		const newData = {
			orderid: isEdit === true ? isEdit : count.toString(),
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

			setDataSource(tempData);
		} else {
			setCount((prevState: number) => (prevState + 1) as number);
			setDataSource(
				(pre: PipelineColumnType[]) => [...pre, newData] as PipelineColumnType[],
			);
			formRef?.current?.resetFields();
			if (tagsListData) {
				formRef?.current?.resetFields();
			}
		}
		formRef?.current?.resetFields();
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
						? `${t('edit_pipeline')} : ${selectedRecord?.name}`
						: t('create_pipeline')}
				</Typography.Title>
			}
			centered
			open={isEdit || isAdd}
			width={800}
			footer={null}
			onCancel={(): void => setActionType(undefined)}
		>
			<Divider plain />
			<div style={{ marginTop: '25px' }}>
				<span>{t('filter')}</span>
				<div style={{ marginTop: '5px' }}>
					<PiplinesSearchBar />
				</div>
			</div>
			<Form
				form={form}
				layout="vertical"
				style={{ marginTop: '20px' }}
				onFinish={onFinish}
				ref={formRef}
			>
				{inputfieldName.map((i) => {
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
								label={<SpanStyle>{i.fieldName}</SpanStyle>}
								key={i.id}
								name={i.name}
							>
								<TagSelect
									setTagsListData={setTagsListData}
									initialvalues={selectedRecord?.tags}
								/>
							</Form.Item>
						);
					}
					return (
						<Form.Item
							required={false}
							label={<SpanStyle>{i.fieldName}</SpanStyle>}
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
		</Modal>
	);
}

interface NewPiplinePropsType {
	isActionType: string | undefined;
	setActionType: (b?: string) => void;
	selectedRecord: PipelineColumnType | undefined;
	setDataSource: (
		value: React.SetStateAction<Array<PipelineColumnType>>,
	) => void;
	formRef: RefObject<FormInstance>;
	handleModalCancelAction: VoidFunction;
	dataSource: Array<PipelineColumnType>;
}
export default NewPipline;
