import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Modal, Table, Typography } from 'antd';
import saveConfig from 'api/pipeline/post';
import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import {
	PipelineData,
	PipelineResponse,
	ProcessorData,
} from 'types/api/pipeline/def';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
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
import { getElementFromArray, getTableColumn, getUpdatedRow } from './utils';

function PipelineListsView({
	isActionType,
	setActionType,
	isActionMode,
	setActionMode,
	piplineData,
}: PipelineListsViewProps): JSX.Element {
	const { t } = useTranslation('pipeline');
	const [modal, contextHolder] = Modal.useModal();
	const [prevPipelineData, setPrevPipelineData] = useState<Array<PipelineData>>(
		piplineData.pipelines,
	);
	const [currPipelineData, setCurrPipelineData] = useState<Array<PipelineData>>(
		piplineData.pipelines,
	);
	const [
		expandedPipelineData,
		setExpandedPipelineData,
	] = useState<PipelineData>();
	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<ProcessorData>();
	const [
		selectedPipelineData,
		setSelectedPipelineData,
	] = useState<PipelineData>();
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
		(record: PipelineData) => (): void => {
			setActionType(ActionType.EditPipeline);
			setSelectedPipelineData(record);
		},
		[setActionType],
	);

	const pipelineDeleteHandler = useCallback(
		(record: PipelineData) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			const filteredData = getElementFromArray(currPipelineData, record, 'id');
			setCurrPipelineData(filteredData);
		},
		[currPipelineData],
	);

	const pipelineDeleteAction = useCallback(
		(record: PipelineData) => (): void => {
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
		(record: ProcessorData) => (): void => {
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
		(updatedRow: PipelineData[]) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			setCurrPipelineData(updatedRow);
		},
		[],
	);

	const onCancelPipelineSequence = useCallback(
		(rawData: PipelineData[]) => (): void => {
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
			expandedPipelineData?.config &&
			expandedPipelineData?.config.map(
				(item: ProcessorData): ProcessorData => ({
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
				expandedPipelineData={expandedPipelineData}
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
		(expanded: boolean, record: PipelineData): void => {
			const keys = [];
			if (expanded) {
				keys.push(record.id);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			setExpandedRow(keys as any);
			setExpandedPipelineData(record);
		},
		[],
	);

	const getExpandIcon = (
		expanded: boolean,
		onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void,
		record: PipelineData,
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

	const onSaveConfigurationHandler = useCallback(async () => {
		setActionMode(ActionMode.Viewing);
		setShowSaveButton(undefined);
		const modifiedPipelineData = currPipelineData.map((item: PipelineData) => {
			const pipelineData = item;
			if (item.id === expandedPipelineData?.id) {
				pipelineData.config = expandedPipelineData?.config;
			}
			return pipelineData;
		});
		const payload = { ...piplineData };
		modifiedPipelineData.forEach((item: PipelineData) => {
			const pipelineData = item;
			delete pipelineData.id;
			return pipelineData;
		});
		payload.pipelines = modifiedPipelineData;
		await saveConfig({
			data: payload,
		});
		setCurrPipelineData(modifiedPipelineData);
		setPrevPipelineData(modifiedPipelineData);
	}, [
		currPipelineData,
		expandedPipelineData?.config,
		expandedPipelineData?.id,
		piplineData,
		setActionMode,
	]);

	const onCancelConfigurationHandler = useCallback((): void => {
		setActionMode(ActionMode.Viewing);
		setShowSaveButton(undefined);
		setCurrPipelineData(prevPipelineData);
		setExpandedRow([]);
	}, [prevPipelineData, setActionMode]);

	const onRowHandler = (index?: number): React.HTMLAttributes<unknown> =>
		({
			index,
			moveRow: movePipelineRow,
		} as React.HTMLAttributes<unknown>);

	const expandableConfig = {
		expandedRowKeys: expandedRow,
		expandIcon: ({ expanded, onExpand, record }: ExpandRowConfig): JSX.Element =>
			getExpandIcon(expanded, onExpand, record),
		onExpand: (expanded: boolean, record: PipelineData): void =>
			getDataOnExpand(expanded, record),
	};

	const pipelineDataSource = useMemo(
		() =>
			currPipelineData.map((item) => ({
				...item,
				key: item.id,
			})),
		[currPipelineData],
	);

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
				expandedPipelineData={expandedPipelineData}
				setExpandedPipelineData={setExpandedPipelineData}
			/>
			<Container>
				<ModeAndConfiguration
					isActionMode={isActionMode}
					verison={piplineData.version}
				/>
				<DndProvider backend={HTML5Backend}>
					<Table
						columns={columns}
						expandedRowRender={expandedRowView}
						expandable={expandableConfig}
						components={tableComponents}
						dataSource={pipelineDataSource}
						onRow={(
							_record: PipelineData,
							index?: number,
						): React.HTMLAttributes<unknown> => onRowHandler(index)}
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
	piplineData: PipelineResponse;
}

interface ExpandRowConfig {
	expanded: boolean;
	onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void;
	record: PipelineData;
}

export interface AlertMessage {
	title: string;
	descrition: string;
	buttontext: string;
	onOk: VoidFunction;
	onCancel?: VoidFunction;
}

export default PipelineListsView;
