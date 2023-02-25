import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Modal, Table, Typography } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
	DeletePipelineData,
	UpdatePipelineData,
	UpdateProcessorData,
} from 'store/actions/pipeline';
import { AppState } from 'store/reducers';
import { PipelineReducerType } from 'store/reducers/pipeline';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
import { configurationVerison } from '../mocks/pipeline';
import AddNewPipeline from './AddNewPipeline';
import AddNewProcessor from './AddNewProcessor';
import { pipelineColumns } from './config';
import ModeAndConfiguration from './ModeAndConfiguration';
import PipelineExpanView from './PipelineExpandView';
import SaveConfigButton from './SaveConfigButton';
import {
	AlertContentWrapper,
	AlertModalTitle,
	Container,
	FooterButton,
} from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import TableExpandIcon from './TableComponents/TableExpandIcon';
import { getTableColumn, getUpdatedRow } from './utils';

function PipelineListsView({
	isActionType,
	setActionType,
	isActionMode,
	setActionMode,
}: PipelineListsViewProps): JSX.Element {
	const dispatch = useDispatch();
	const { t } = useTranslation('pipeline');
	const { pipelineData } = useSelector<AppState, PipelineReducerType>(
		(state) => state.pipeline,
	);
	const [activeExpRow, setActiveExpRow] = useState<Array<number>>();
	const [selectedRecord, setSelectedRecord] = useState<PipelineColumn>();
	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<ProcessorColumn>();
	const [isVisibleSaveButton, setIsVisibleSaveButton] = useState<string>();

	const [modal, contextHolder] = Modal.useModal();

	const handleAlert = useCallback(
		({ title, descrition, buttontext, onCancel, onOk }: AlertMessage) => {
			modal.confirm({
				title: <AlertModalTitle>{title}</AlertModalTitle>,
				icon: <ExclamationCircleOutlined />,
				content: <AlertContentWrapper>{descrition}</AlertContentWrapper>,
				okText: <Typography.Text>{buttontext}</Typography.Text>,
				cancelText: <Typography.Text>{t('cancel')}</Typography.Text>,
				onOk,
				onCancel,
			});
		},
		[modal, t],
	);

	const onDeleteClickHandler = useCallback(
		() => setIsVisibleSaveButton(ActionMode.Editing),
		[setIsVisibleSaveButton],
	);

	const handlePipelineEditAction = useCallback(
		(record: PipelineColumn) => (): void => {
			setActionType(ActionType.EditPipeline);
			setSelectedRecord(record);
		},
		[setActionType],
	);

	const pipelineDeleteHandler = useCallback(
		(record: PipelineColumn) => (): void => {
			onDeleteClickHandler();
			dispatch(DeletePipelineData(pipelineData, record));
		},
		[pipelineData, dispatch, onDeleteClickHandler],
	);

	const handlePipelineDeleteAction = useCallback(
		(record: PipelineColumn) => (): void => {
			handleAlert({
				title: `${t('delete_pipeline')} : ${record.name}?`,
				descrition: t('delete_pipeline_description'),
				buttontext: t('delete'),
				onOk: pipelineDeleteHandler(record),
			});
		},
		[handleAlert, pipelineDeleteHandler, t],
	);

	const handleProcessorEditAction = useCallback(
		(record: ProcessorColumn) => (): void => {
			setActionType(ActionType.EditProcessor);
			setSelectedProcessorData(record);
		},
		[setActionType],
	);

	const columns = useMemo(() => {
		const fieldColumns = getTableColumn(pipelineColumns);
		if (isActionMode === ActionMode.Editing) {
			fieldColumns.push(
				{
					title: 'Actions',
					dataIndex: 'smartAction',
					key: 'smartAction',
					align: 'center',
					render: (_value, record): JSX.Element => (
						<PipelineActions
							isPipelineAction
							editAction={handlePipelineEditAction(record)}
							deleteAction={handlePipelineDeleteAction(record)}
						/>
					),
				},
				{
					title: '',
					dataIndex: 'dragAction',
					key: 'dragAction',
					render: () => <DragAction />,
				},
			);
		}
		return fieldColumns;
	}, [handlePipelineDeleteAction, handlePipelineEditAction, isActionMode]);

	const updatePipelineSequence = useCallback(
		(updatedRow: PipelineColumn[]) => (): void => {
			setIsVisibleSaveButton(ActionMode.Editing);
			dispatch(UpdatePipelineData(updatedRow));
		},
		[dispatch],
	);

	const onCancelPipelineRowData = useCallback(
		(rawData: PipelineColumn[]) => (): void => {
			console.log(rawData, 'rawData');
			dispatch(UpdatePipelineData(rawData));
		},
		[dispatch],
	);

	const movePipelineRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (pipelineData && isActionMode === ActionMode.Editing) {
				const rawData = pipelineData;
				const updatedRow = getUpdatedRow(pipelineData, dragIndex, hoverIndex);
				handleAlert({
					title: t('reorder_pipeline'),
					descrition: t('reorder_pipeline_description'),
					buttontext: t('reorder'),
					onOk: updatePipelineSequence(updatedRow),
					onCancel: onCancelPipelineRowData(rawData),
				});
			}
		},
		[
			t,
			pipelineData,
			isActionMode,
			handleAlert,
			updatePipelineSequence,
			onCancelPipelineRowData,
		],
	);

	const expandedRow = useCallback(
		(): JSX.Element => (
			<PipelineExpanView
				handleAlert={handleAlert}
				setActionType={setActionType}
				handleProcessorEditAction={handleProcessorEditAction}
				isActionMode={isActionMode}
				onDeleteClickHandler={onDeleteClickHandler}
				setIsVisibleSaveButton={setIsVisibleSaveButton}
			/>
		),
		[
			handleAlert,
			handleProcessorEditAction,
			isActionMode,
			onDeleteClickHandler,
			setActionType,
		],
	);

	const getDataOnExpand = (expanded: boolean, record: PipelineColumn): void => {
		const keys = [];
		if (expanded) {
			keys.push(record.orderid);
		}
		setActiveExpRow(keys);
		const processorData = record.operators.map(
			(item: PipelineOperators): ProcessorColumn => ({
				id: item.id,
				type: item.type,
				processorName: item.name,
				description: item.output,
			}),
		);
		dispatch(UpdateProcessorData(processorData));
	};

	const getExpandIcon = (
		expanded: boolean,
		onExpand: (record: PipelineColumn, e: React.MouseEvent<HTMLElement>) => void,
		record: PipelineColumn,
	): JSX.Element => (
		<TableExpandIcon expanded={expanded} onExpand={onExpand} record={record} />
	);

	const onClickHandler = useCallback((): void => {
		setActionType(ActionType.AddPipeline);
	}, [setActionType]);

	const footer = useCallback((): JSX.Element | undefined => {
		if (isActionMode === ActionMode.Editing) {
			return (
				<FooterButton type="link" onClick={onClickHandler} icon={<PlusOutlined />}>
					{t('add_new_pipeline')}
				</FooterButton>
			);
		}
		return undefined;
	}, [isActionMode, onClickHandler, t]);

	return (
		<div>
			{contextHolder}
			<AddNewPipeline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedRecord={selectedRecord}
				setIsVisibleSaveButton={setIsVisibleSaveButton}
			/>
			<AddNewProcessor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				setIsVisibleSaveButton={setIsVisibleSaveButton}
			/>
			<Container>
				<ModeAndConfiguration
					isActionMode={isActionMode}
					verison={configurationVerison}
				/>
				<DndProvider backend={HTML5Backend}>
					<Table
						columns={columns}
						expandedRowRender={expandedRow}
						expandable={{
							expandedRowKeys: activeExpRow,
							expandIcon: ({ expanded, onExpand, record }): JSX.Element =>
								getExpandIcon(expanded, onExpand, record),
							onExpand: (expanded, record): void => getDataOnExpand(expanded, record),
						}}
						components={tableComponents}
						dataSource={pipelineData.map((item) => ({
							...item,
							key: item.orderid,
						}))}
						onRow={(
							_record: PipelineColumn,
							index?: number,
						): React.HTMLAttributes<unknown> => {
							const attr = {
								index,
								moveRow: movePipelineRow,
							};
							return attr as React.HTMLAttributes<unknown>;
						}}
						footer={footer}
						pagination={false}
					/>
				</DndProvider>
				{isVisibleSaveButton && (
					<SaveConfigButton
						setActionMode={setActionMode}
						setIsVisibleSaveButton={setIsVisibleSaveButton}
					/>
				)}
			</Container>
		</div>
	);
}

interface PipelineListsViewProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	isActionMode: string;
	setActionMode: (actionMode: ActionMode) => void;
}

export type ActionBy = {
	username: string;
	email: string;
};

type ParseType = {
	parse_from: string;
};

export interface PipelineOperators {
	type: string;
	name: string;
	id: string;
	field?: string;
	parse_from?: string;
	parse_to?: string;
	output?: string;
	pattern?: string;
	trace_id?: ParseType;
	span_id?: ParseType;
	trace_flags?: ParseType;
}

export interface PipelineColumn {
	orderid: number;
	uuid: string;
	createdAt: string;
	createdBy: ActionBy;
	updatedAt: string;
	updatedBy: ActionBy;
	version: string;
	name: string;
	alias: string;
	enabled: boolean;
	filter: string;
	tags: Array<string>;
	operators: Array<PipelineOperators>;
}

export interface ProcessorColumn {
	id: string | number;
	type?: string;
	processorName?: string;
	description?: string;
}

export interface AlertMessage {
	title: string;
	descrition: string;
	buttontext: string;
	onOk: VoidFunction;
	onCancel?: VoidFunction;
}

export default PipelineListsView;
