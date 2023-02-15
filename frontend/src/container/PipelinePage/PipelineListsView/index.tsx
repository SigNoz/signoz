import {
	DownOutlined,
	ExclamationCircleOutlined,
	PlusOutlined,
	RightOutlined,
} from '@ant-design/icons';
import { Avatar, Modal, Space, Switch, Table, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { ColumnsType } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import React, { useCallback, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionType } from '../Layouts';
import { pipelineData } from '../mocks/pipeline';
import AddNewPipline from './AddNewPipline';
import AddNewProcessor from './AddNewProcessor';
import PipelineExpanView from './PipelineExpandView';
import {
	AlertContentWrapper,
	AlertModalTitle,
	Container,
	DeleteFilledIcon,
	EditOutlinedIcon,
	EyeFilledIcon,
	FooterButton,
	HolderOutlinedIcon,
	LastActionColumn,
} from './styles';
import { getElementFromArray, getUpdatedRow } from './utils';

function PipelineListsView({
	isActionType,
	setActionType,
}: PipelineListsViewProps): JSX.Element {
	const { t } = useTranslation('pipeline');
	const formRef = useRef<FormInstance>(null);
	const [pipelineDataSource, setPipelineDataSource] = useState<
		Array<PipelineColumn>
	>(pipelineData);
	const [processorDataSource, setProcessorDataSource] = useState<
		Array<ProcessorColumn>
	>();
	const [activeExpRow, setActiveExpRow] = useState<Array<number>>();
	const [selectedRecord, setSelectedRecord] = useState<PipelineColumn>();
	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<ProcessorColumn>();

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

	const handlePipelineEditAction = (record: PipelineColumn) => (): void => {
		setActionType(ActionType.EditPipeline);
		setSelectedRecord(record);
	};

	const pipelineDeleteHandler = useCallback(
		(record: PipelineColumn) => (): void => {
			const findElement = getElementFromArray(
				pipelineDataSource,
				record,
				'orderid',
			);
			setPipelineDataSource(findElement);
		},
		[pipelineDataSource],
	);

	const handlePipelineDeleteAction = (record: PipelineColumn) => (): void => {
		handleAlert({
			title: `${t('delete_pipeline')} : ${record.name}?`,
			descrition: t('delete_pipeline_description'),
			buttontext: t('delete'),
			onOk: pipelineDeleteHandler(record),
		});
	};

	const handleProcessorEditAction = (record: ProcessorColumn) => (): void => {
		setActionType(ActionType.EditProcessor);
		setSelectedProcessorData(record);
	};

	const dragActionHandler = (): JSX.Element => (
		<LastActionColumn>
			<span>
				<Switch />
			</span>
			<span style={{ cursor: 'move' }}>
				<HolderOutlinedIcon />
			</span>
		</LastActionColumn>
	);

	const pipelineColumns: ColumnsType<PipelineColumn> = [
		{
			title: '',
			dataIndex: 'orderid',
			key: 'orderid',
			width: 10,
			render: (i: number): JSX.Element => (
				<Avatar style={{ background: themeColors.navyBlue }} size="small">
					{i}
				</Avatar>
			),
		},
		{
			title: 'Pipeline Name',
			dataIndex: 'name',
			key: 'name',
			width: 80,
		},
		{
			title: 'Filters',
			dataIndex: 'filter',
			key: 'filter',
			width: 50,
		},
		{
			title: 'Tags',
			dataIndex: 'tags',
			key: 'tags',
			width: 20,
			render: (value): React.ReactNode =>
				value?.map((tag: string) => (
					<Tag color="magenta" key={tag}>
						{tag}
					</Tag>
				)),
		},
		{
			title: 'Last Edited',
			dataIndex: 'updatedAt',
			key: 'updatedAt',
			width: 50,
		},
		{
			title: 'Edited By',
			dataIndex: 'updatedBy',
			key: 'updatedBy',
			width: 50,
			render: (value): JSX.Element => <span>{value?.username}</span>,
		},
		{
			title: 'Actions',
			dataIndex: 'smartAction',
			key: 'smart-action',
			align: 'center',
			width: 100,
			render: (_value, record): JSX.Element => (
				<Space size="middle">
					<span>
						<EditOutlinedIcon onClick={handlePipelineEditAction(record)} />
					</span>
					<span>
						<EyeFilledIcon />
					</span>
					<span>
						<DeleteFilledIcon onClick={handlePipelineDeleteAction(record)} />
					</span>
				</Space>
			),
		},
		{
			title: '',
			dataIndex: 'action',
			key: 'action',
			width: 80,
			render: dragActionHandler,
		},
	];

	const movePipelineRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (pipelineDataSource) {
				const rawData = pipelineDataSource;
				const updatedRow = getUpdatedRow(pipelineDataSource, dragIndex, hoverIndex);

				handleAlert({
					title: t('reorder_pipeline'),
					descrition: t('reorder_pipeline_description'),
					buttontext: t('reorder'),
					onOk: (): void => setPipelineDataSource(updatedRow),
					onCancel: (): void => setPipelineDataSource(rawData),
				});
			}
		},
		[pipelineDataSource, handleAlert, t],
	);

	const expandedRow = (): JSX.Element => (
		<PipelineExpanView
			dragActionHandler={dragActionHandler}
			handleAlert={handleAlert}
			setProcessorDataSource={setProcessorDataSource}
			processorDataSource={processorDataSource as []}
			setActionType={setActionType}
			handleProcessorEditAction={handleProcessorEditAction}
		/>
	);

	const getDataOnExpand = (expanded: boolean, record: PipelineColumn): void => {
		const keys = [];
		if (expanded) {
			keys.push(record.orderid);
		}
		setActiveExpRow(keys);
		const processorData = record.operators.map(
			(item: PipelineOperators, index: number): ProcessorColumn => ({
				id: index,
				text: item.name,
			}),
		);
		setProcessorDataSource(processorData);
	};

	const getExpandIcon = (
		expanded: boolean,
		onExpand: (record: PipelineColumn, e: React.MouseEvent<HTMLElement>) => void,
		record: PipelineColumn,
	): JSX.Element => {
		if (expanded) {
			return <DownOutlined onClick={(e): void => onExpand(record, e)} />;
		}
		return <RightOutlined onClick={(e): void => onExpand(record, e)} />;
	};

	const onClickHandler = useCallback((): void => {
		setActionType(ActionType.AddPipeline);
	}, [setActionType]);

	const footer = useCallback(
		(): JSX.Element => (
			<FooterButton type="link" onClick={onClickHandler} icon={<PlusOutlined />}>
				{t('add_new_pipeline')}
			</FooterButton>
		),
		[onClickHandler, t],
	);

	const handleModalCancelAction = (): void => {
		setActionType(undefined);
		formRef?.current?.resetFields();
	};

	return (
		<div>
			{contextHolder}
			<AddNewPipline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedRecord={selectedRecord}
				pipelineDataSource={pipelineDataSource}
				setPipelineDataSource={setPipelineDataSource}
				formRef={formRef}
				handleModalCancelAction={handleModalCancelAction}
			/>
			<AddNewProcessor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				processorDataSource={processorDataSource as []}
				setProcessorDataSource={
					setProcessorDataSource as () => Array<ProcessorColumn>
				}
				formRef={formRef}
				handleModalCancelAction={handleModalCancelAction}
			/>
			<Container>
				<DndProvider backend={HTML5Backend}>
					<Table
						columns={pipelineColumns}
						expandedRowRender={expandedRow}
						expandable={{
							expandedRowKeys: activeExpRow,
							expandIcon: ({ expanded, onExpand, record }): JSX.Element =>
								getExpandIcon(expanded, onExpand, record),
							onExpand: (expanded, record): void => getDataOnExpand(expanded, record),
						}}
						components={tableComponents}
						dataSource={pipelineDataSource.map((item) => ({
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
					/>
				</DndProvider>
			</Container>
		</div>
	);
}

interface PipelineListsViewProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
}

interface ActionBy {
	username: string;
	email: string;
}

interface ParseType {
	parse_from: string;
}

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
	id?: number | string;
	text: string;
}

export interface AlertMessage {
	title: string;
	descrition: string;
	buttontext: string;
	onOk: VoidFunction;
	onCancel?: VoidFunction;
}

export default PipelineListsView;
