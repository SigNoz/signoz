import { Button, Divider, Form, Modal } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NewAddPiplineData, UpdatePipelineData } from 'store/actions';
import { AppState } from 'store/reducers';
import { PiplineReducerType } from 'store/reducers/pipeline';
import AppReducer from 'types/reducer/app';
import { v4 as uuid } from 'uuid';

import { ActionMode, ActionType } from '../../Layouts';
import { PipelineColumn } from '..';
import { ModalButtonWrapper, ModalTitle } from '../styles';
import { renderPipelineForm } from './utils';

function AddNewPipeline({
	isActionType,
	setActionType,
	selectedRecord,
	setIsVisibleSaveButton,
}: AddNewPipelineProps): JSX.Element {
	const [form] = Form.useForm();
	const dispatch = useDispatch();
	const { t } = useTranslation('pipeline');
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const [count, setCount] = useState(3);
	const [tagsListData, setTagsListData] = useState<PipelineColumn['tags']>();

	const isEdit = useMemo(() => isActionType === 'edit-pipeline', [isActionType]);
	const isAdd = useMemo(() => isActionType === 'add-pipeline', [isActionType]);

	const { pipelineData } = useSelector<AppState, PiplineReducerType>(
		(state) => state.pipeline,
	);

	useEffect(() => {
		if (isEdit) {
			setTagsListData(selectedRecord?.tags);
			form.setFieldsValue(selectedRecord);
		} else {
			setTagsListData([]);
		}
	}, [form, isEdit, selectedRecord, selectedRecord?.tags]);

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
			dispatch(
				UpdatePipelineData(pipelineData, selectedRecord, values, tagsListData),
			);
		} else {
			setTagsListData([]);
			setCount((prevState: number) => (prevState + 1) as number);
			dispatch(NewAddPiplineData((newPipeLineData as unknown) as PipelineColumn));
		}
		setActionType(undefined);
	};

	const onCancelHandler = (): void => {
		setActionType(undefined);
	};

	const modalTitle = useMemo(
		(): string =>
			isEdit
				? `${t('edit_pipeline')} : ${selectedRecord?.name}`
				: t('create_pipeline'),
		[isEdit, selectedRecord?.name, t],
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
				name="addNewPipeline"
				layout="vertical"
				style={{ marginTop: '1.25rem' }}
				onFinish={onFinish}
				autoComplete="off"
				form={form}
			>
				{renderPipelineForm(setTagsListData, tagsListData)}
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

interface AddNewPipelineProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	selectedRecord: PipelineColumn | undefined;
	setIsVisibleSaveButton: (actionMode: ActionMode) => void;
}

export default AddNewPipeline;
