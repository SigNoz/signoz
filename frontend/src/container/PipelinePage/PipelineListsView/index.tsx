import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Modal, Table, Typography } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
import { configurationVerison, pipelineMockData } from '../mocks/pipeline';
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
import {
	AlertMessage,
	PipelineColumn,
	PipelineOperators,
	ProcessorColumn,
} from './types';
import { getElementFromArray, getTableColumn, getUpdatedRow } from './utils';

function PipelineListsView({
	isActionType,
	setActionType,
	isActionMode,
	setActionMode,
}: PipelineListsViewProps): JSX.Element {
	const { t } = useTranslation('pipeline');
	const [modal, contextHolder] = Modal.useModal();
	const [prevPipelineData, setPrevPipelineData] = useState<
		Array<PipelineColumn>
	>(pipelineMockData);
	const [currPipelineData, setCurrPipelineData] = useState<
		Array<PipelineColumn>
	>(pipelineMockData);
	const [
		expandedPipelineData,
		setExpandedPipelineData,
	] = useState<PipelineColumn>();
	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<ProcessorColumn>();
	const [
		selectedPipelineData,
		setSelectedPipelineData,
	] = useState<PipelineColumn>();
	const [expandedRow, setExpandedRow] = useState<Array<string>>();
	const [showSaveButton, setShowSaveButton] = useState<string>();

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

	const pipelineEditAction = useCallback(
		(record: PipelineColumn) => (): void => {
			setActionType(ActionType.EditPipeline);
			setSelectedPipelineData(record);
		},
		[setActionType],
	);

	const pipelineDeleteHandler = useCallback(
		(record: PipelineColumn) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			const filteredData = getElementFromArray(currPipelineData, record, 'uuid');
			setCurrPipelineData(filteredData);
		},
		[currPipelineData],
	);

	const pipelineDeleteAction = useCallback(
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

	const processorEditAction = useCallback(
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
							editAction={pipelineEditAction(record)}
							deleteAction={pipelineDeleteAction(record)}
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
	}, [pipelineDeleteAction, pipelineEditAction, isActionMode]);

	const updatePipelineSequence = useCallback(
		(updatedRow: PipelineColumn[]) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			setCurrPipelineData(updatedRow);
		},
		[],
	);

	const onCancelPipelineSequence = useCallback(
		(rawData: PipelineColumn[]) => (): void => {
			setCurrPipelineData(rawData);
		},
		[],
	);

	const movePipelineRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (currPipelineData && isActionMode === ActionMode.Editing) {
				const rawData = currPipelineData;
				const updatedRow = getUpdatedRow(currPipelineData, dragIndex, hoverIndex);
				handleAlert({
					title: t('reorder_pipeline'),
					descrition: t('reorder_pipeline_description'),
					buttontext: t('reorder'),
					onOk: updatePipelineSequence(updatedRow),
					onCancel: onCancelPipelineSequence(rawData),
				});
			}
		},
		[
			t,
			currPipelineData,
			isActionMode,
			handleAlert,
			updatePipelineSequence,
			onCancelPipelineSequence,
		],
	);

	const processorData = useMemo(
		() =>
			expandedPipelineData?.operators.map(
				(item: PipelineOperators): ProcessorColumn => ({
					id: String(item.id),
					type: item.type,
					name: item.name,
					output: item.output,
				}),
			),
		[expandedPipelineData],
	);

	const expandedRowView = useCallback(
		(): JSX.Element => (
			<PipelineExpanView
				handleAlert={handleAlert}
				isActionMode={isActionMode}
				setActionType={setActionType}
				processorEditAction={processorEditAction}
				setShowSaveButton={setShowSaveButton}
				expandedPipelineData={expandedPipelineData as PipelineColumn}
				setExpandedPipelineData={setExpandedPipelineData}
				processorData={processorData}
			/>
		),
		[
			handleAlert,
			processorEditAction,
			isActionMode,
			processorData,
			expandedPipelineData,
			setActionType,
		],
	);

	const getDataOnExpand = useCallback(
		(expanded: boolean, record: PipelineColumn): void => {
			const keys = [];
			if (expanded) {
				keys.push(record.uuid);
			}
			setExpandedRow(keys);
			setExpandedPipelineData(record);
		},
		[],
	);

	const getExpandIcon = (
		expanded: boolean,
		onExpand: (record: PipelineColumn, e: React.MouseEvent<HTMLElement>) => void,
		record: PipelineColumn,
	): JSX.Element => (
		<TableExpandIcon expanded={expanded} onExpand={onExpand} record={record} />
	);

	const addNewPipelineHandler = useCallback((): void => {
		setActionType(ActionType.AddPipeline);
	}, [setActionType]);

	const footer = useCallback((): JSX.Element | undefined => {
		if (isActionMode === ActionMode.Editing) {
			return (
				<FooterButton
					type="link"
					onClick={addNewPipelineHandler}
					icon={<PlusOutlined />}
				>
					{t('add_new_pipeline')}
				</FooterButton>
			);
		}
		return undefined;
	}, [isActionMode, addNewPipelineHandler, t]);

	const onSaveConfigurationHandler = useCallback((): void => {
		setActionMode(ActionMode.Viewing);
		setShowSaveButton(undefined);
		const modifiedPipelineData = currPipelineData.map((item: PipelineColumn) => {
			const pipelineData = item;
			if (item.uuid === expandedPipelineData?.uuid) {
				pipelineData.operators = expandedPipelineData?.operators;
			}
			return pipelineData;
		});
		setCurrPipelineData(modifiedPipelineData);
		setPrevPipelineData(modifiedPipelineData);
	}, [currPipelineData, expandedPipelineData, setActionMode]);

	const onCancelConfigurationHandler = useCallback((): void => {
		setActionMode(ActionMode.Viewing);
		setShowSaveButton(undefined);
		setCurrPipelineData(prevPipelineData);
		setExpandedRow([]);
	}, [prevPipelineData, setActionMode]);

	return (
		<div>
			{contextHolder}
			<AddNewPipeline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedPipelineData={selectedPipelineData}
				setShowSaveButton={setShowSaveButton}
				setCurrPipelineData={setCurrPipelineData}
				currPipelineData={currPipelineData}
			/>
			<AddNewProcessor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				setShowSaveButton={setShowSaveButton}
				expandedPipelineData={expandedPipelineData as PipelineColumn}
				setExpandedPipelineData={setExpandedPipelineData}
			/>
			<Container>
				<ModeAndConfiguration
					isActionMode={isActionMode}
					verison={configurationVerison}
				/>
				<DndProvider backend={HTML5Backend}>
					<Table
						columns={columns}
						expandedRowRender={expandedRowView}
						expandable={{
							expandedRowKeys: expandedRow,
							expandIcon: ({ expanded, onExpand, record }): JSX.Element =>
								getExpandIcon(expanded, onExpand, record),
							onExpand: (expanded, record): void => getDataOnExpand(expanded, record),
						}}
						components={tableComponents}
						dataSource={currPipelineData.map((item) => ({
							...item,
							key: item.uuid,
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
				{showSaveButton && (
					<SaveConfigButton
						onSaveConfigurationHandler={onSaveConfigurationHandler}
						onCancelConfigurationHandler={onCancelConfigurationHandler}
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

export default PipelineListsView;
