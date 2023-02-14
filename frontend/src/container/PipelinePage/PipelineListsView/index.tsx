import {
	DownOutlined,
	ExclamationCircleOutlined,
	HolderOutlined,
	PlusOutlined,
	RightOutlined,
} from '@ant-design/icons';
import { Avatar, Modal, Space, Switch, Table, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { ColumnsType } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import React, { useCallback, useRef, useState } from 'react';
import update from 'react-addons-update';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionType } from '../Layouts';
import { pipelineData } from '../mocks/pipeline';
import {
	ActionIcon,
	AlertContentWrapper,
	AlertModalTitle,
	Container,
	FooterButton,
	LastActionColumnStyle,
} from '../styles';
import AddNewPipline from './AddNewPipline';
import AddNewProcessor from './AddNewProcessor';
import PipelineExpanView from './PipelineExpandView';

function PipelineListsView({
	isActionType,
	setActionType,
}: PipelineListsViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline', 'common']);
	const formRef = useRef<FormInstance>(null);
	const [dataSource, setDataSource] = useState<Array<PipelineColumn>>(
		pipelineData,
	);
	const [childDataSource, setChildDataSource] = useState<
		Array<SubPiplineColums>
	>();
	const [activeExpRow, setActiveExpRow] = useState<Array<number>>();
	const [selectedRecord, setSelectedRecord] = useState<PipelineColumn>();
	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<SubPiplineColums>();

	const [modal, contextHolder] = Modal.useModal();

	const handleAlert = useCallback(
		({
			title,
			descrition,
			buttontext,
			onCancelClick,
			onOkClick,
		}: AlertMessage) => {
			modal.confirm({
				title: <AlertModalTitle level={1}>{title}</AlertModalTitle>,
				icon: <ExclamationCircleOutlined />,
				content: <AlertContentWrapper>{descrition}</AlertContentWrapper>,
				okText: <Typography.Text>{buttontext}</Typography.Text>,
				cancelText: <Typography.Text>{t('cancel')}</Typography.Text>,
				onOk: onOkClick,
				onCancel: onCancelClick,
			});
		},
		[modal, t],
	);

	const handlePipelineEditAction = (record: PipelineColumn) => (): void => {
		setActionType(ActionType.EditPipeline);
		setSelectedRecord(record);
	};

	const handleDelete = (record: PipelineColumn) => (): void => {
		const findElement = dataSource?.filter(
			(data) => data.orderid !== record.orderid,
		);
		setDataSource(findElement);
	};

	const handlePipelineDeleteAction = (record: PipelineColumn) => (): void => {
		handleAlert({
			title: `${t('delete_pipeline')} : ${record.name}?`,
			descrition: t('delete_pipeline_description'),
			buttontext: t('delete'),
			onOkClick: handleDelete(record),
		});
	};

	const handleProcessorEditAction = (record: SubPiplineColums) => (): void => {
		setActionType(ActionType.EditProcessor);
		setSelectedProcessorData(record);
	};

	const dragActionHandler = (): JSX.Element => (
		<LastActionColumnStyle>
			<span>
				<Switch />
			</span>
			<span style={{ cursor: 'move' }}>
				<HolderOutlined
					style={{
						color: themeColors.lightSkyBlue,
						fontSize: '1.12rem',
					}}
				/>
			</span>
		</LastActionColumnStyle>
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
						<ActionIcon onClick={handlePipelineEditAction(record)} />
					</span>
					<span>
						<ActionIcon />
					</span>
					<span>
						<ActionIcon onClick={handlePipelineDeleteAction(record)} />
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
			const rawData = dataSource;
			const dragRow = dataSource[dragIndex];
			const updatedRow = update(dataSource, {
				$splice: [
					[dragIndex, 1],
					[hoverIndex, 0, dragRow],
				],
			});

			if (dragRow) {
				handleAlert({
					title: t('reorder_pipeline'),
					descrition: t('reorder_pipeline_description'),
					buttontext: t('reorder'),
					onOkClick: (): void => setDataSource(updatedRow),
					onCancelClick: (): void => setDataSource(rawData),
				});
			}
		},
		[dataSource, handleAlert, t],
	);

	const expandedRow = (): JSX.Element => (
		<PipelineExpanView
			dragActionHandler={dragActionHandler}
			handleAlert={handleAlert}
			setChildDataSource={setChildDataSource}
			childDataSource={childDataSource}
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
			(item: PipelineOperators, index: number): SubPiplineColums => ({
				id: index,
				text: item.name,
			}),
		);
		setChildDataSource(processorData);
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

	const onClickHandler = (): void => {
		setActionType(ActionType.AddPipeline);
	};

	const footer = (): JSX.Element => (
		<FooterButton type="link" onClick={onClickHandler} icon={<PlusOutlined />}>
			{t('add_new_pipeline')}
		</FooterButton>
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
				setDataSource={setDataSource}
				formRef={formRef}
				handleModalCancelAction={handleModalCancelAction}
				dataSource={dataSource}
			/>
			<AddNewProcessor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				setChildDataSource={setChildDataSource as () => Array<SubPiplineColums>}
				formRef={formRef}
				handleModalCancelAction={handleModalCancelAction}
				childDataSource={childDataSource as []}
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
						dataSource={dataSource.map((item) => ({
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

export interface SubPiplineColums {
	id?: number | string;
	text: string;
}

export interface AlertMessage {
	title: string;
	descrition: string;
	buttontext: string;
	onCancelClick?: VoidFunction;
	onOkClick?: VoidFunction;
}

export default PipelineListsView;
