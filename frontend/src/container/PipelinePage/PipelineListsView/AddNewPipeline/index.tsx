import { Button, Divider, Form, Input, Modal } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { v4 as uuid } from 'uuid';

import TagInput from '../../components/TagInput';
import { ActionType } from '../../Layouts';
import { PipelineColumn } from '..';
import { addPipelinefieldLists } from '../config';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { getRecordIndex } from '../utils';
import { FormLabelStyle } from './styles';

function AddNewPipeline({
	isActionType,
	setActionType,
	selectedRecord,
	pipelineDataSource,
	setPipelineDataSource,
}: AddNewPipelineProps): JSX.Element {
	const [form] = Form.useForm();
	const { t } = useTranslation('pipeline');
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const [count, setCount] = useState(3);
	const [tagsListData, setTagsListData] = useState<PipelineColumn['tags']>();

	const isEdit = useMemo(() => isActionType === 'edit-pipeline', [isActionType]);
	const isAdd = useMemo(() => isActionType === 'add-pipeline', [isActionType]);

	useEffect(() => {
		if (isEdit) {
			setTagsListData(selectedRecord?.tags);
		} else {
			setTagsListData([]);
		}
	}, [isEdit, selectedRecord?.tags]);

	const onFinish = (values: PipelineColumn): void => {
		const newPipeLineData = {
			orderid: count,
			uuid: uuid(),
			createdAt: new Date().toISOString(),
			createdBy: {
				username: user?.name,
				email: user?.email,
			},
			updatedAt: new Date().toISOString(),
			updatedBy: {
				username: user?.name,
				email: user?.email,
			},
			name: values.name,
			alias: values.alias,
			filter: values.filter,
			tags: tagsListData,
			operators: [],
		};

		if (isEdit) {
			const findRecordIndex = getRecordIndex(
				pipelineDataSource,
				selectedRecord,
				'name' as never,
			);
			const updatedPipelineData = {
				...pipelineDataSource[findRecordIndex],
				name: values.name,
				alias: values.alias,
				filter: values.filter,
				tags: tagsListData,
			};

			const finalData = pipelineDataSource?.map((data) =>
				data.name === selectedRecord?.name ? updatedPipelineData : data,
			);
			setPipelineDataSource(finalData as Array<PipelineColumn>);
		} else {
			setCount((prevState: number) => (prevState + 1) as number);
			setPipelineDataSource(
				(prevState: PipelineColumn[]) =>
					[...prevState, newPipeLineData] as PipelineColumn[],
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
						? `${t('edit_pipeline')} : ${selectedRecord?.name}`
						: t('create_pipeline')}
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
				name="addNewPipeline"
				initialValues={isEdit ? selectedRecord : {}}
				layout="vertical"
				style={{ marginTop: '1.25rem' }}
				onFinish={onFinish}
				autoComplete="off"
				form={form}
			>
				{addPipelinefieldLists.map((item) => {
					if (item.id === '1') {
						return (
							<Form.Item
								required={false}
								label={<FormLabelStyle>{item.fieldName}</FormLabelStyle>}
								key={item.id}
								rules={[
									{
										required: true,
									},
								]}
								name={item.name}
							>
								<Input.Search
									id={item.id}
									name={item.name}
									placeholder={t(t(item.placeholder))}
									allowClear
								/>
							</Form.Item>
						);
					}
					if (item.id === '2') {
						return (
							<Form.Item
								required={false}
								label={<FormLabelStyle>{item.fieldName}</FormLabelStyle>}
								key={item.id}
								rules={[
									{
										required: true,
									},
								]}
								name={item.name}
							>
								<Input name={item.name} placeholder={t(item.placeholder)} />
							</Form.Item>
						);
					}
					if (item.id === '3') {
						return (
							<Form.Item
								required={false}
								label={<FormLabelStyle>{item.fieldName}</FormLabelStyle>}
								key={item.id}
								name={item.name}
							>
								<TagInput
									setTagsListData={setTagsListData}
									tagsListData={tagsListData as []}
									placeHolder={t(item.placeholder)}
								/>
							</Form.Item>
						);
					}
					if (item.id === '4') {
						return (
							<Form.Item
								required={false}
								name={item.name}
								label={item.fieldName}
								key={item.id}
								rules={[
									{
										required: true,
									},
								]}
							>
								<Input.TextArea
									rows={3}
									name={item.name}
									placeholder={t(item.placeholder)}
								/>
							</Form.Item>
						);
					}
					return <span key={item.id}>No Data</span>;
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

interface AddNewPipelineProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	selectedRecord: PipelineColumn | undefined;
	pipelineDataSource: Array<PipelineColumn>;
	setPipelineDataSource: (
		value: React.SetStateAction<Array<PipelineColumn>>,
	) => void;
}

export default AddNewPipeline;
