import {
	DeleteFilled,
	DownOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	EyeFilled,
	HolderOutlined,
	PlusOutlined,
	RightOutlined,
} from '@ant-design/icons';
import {
	Avatar,
	Button,
	Modal,
	Space,
	Switch,
	Table,
	Tag,
	Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { ColumnsType } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import React, { useCallback, useRef, useState } from 'react';
import update from 'react-addons-update';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import ChildListOfProcessor from './ChildListOfProcessor';
import {
	iconStyle,
	modalFooterStyle,
	modalTitleStyle,
	tableComponents,
} from './config';
import Pipline from './Pipeline';
import Processor from './Processor';
import {
	AlertContentWrapper,
	Container,
	LastActionColumnStyle,
} from './styles';

export const pipelineData: Array<PipelineColumnType> = [
	{
		orderid: 1,
		uuid: '22a588b8-cccc-4a49-94f1-2caa28271315',
		createdAt: '1674205513092137500',
		createdBy: {
			username: 'nitya',
			email: 'nityananda@signoz.io',
		},
		updatedAt: 'Mon Feb 06 2023',
		updatedBy: {
			username: 'nitya',
			email: '',
		},
		version: 'myversion1',
		name: 'Apache common parser',
		alias: 'apachecommonparser',
		enabled: true,
		filter: 'attributes.source == nginx',
		tags: ['server', 'app'],
		operators: [
			{
				type: 'grok',
				name: 'grok use common',
				id: 'grokusecommon',
				output: 'renameauth',
				pattern: '%{COMMONAPACHELOG}',
				parse_from: 'body',
				parse_to: 'attributes',
			},
			{
				type: 'move',
				name: 'rename auth',
				id: 'renameauth',
				parse_from: 'attributes.auth',
				parse_to: 'attributes.username',
			},
		],
	},
	{
		orderid: 2,
		uuid: 'f58ce70c-5f41-48bc-949d-a822e2409257',
		version: 'myversion1',
		createdAt: '1674205513092137500',
		createdBy: {
			username: 'nitya',
			email: 'nityananda@signoz.io',
		},
		updatedAt: 'Sun Feb 05 2023',
		updatedBy: {
			username: 'nityananda',
			email: '',
		},
		name: 'myservice trace parser',
		alias: 'myservicetraceparser',
		enabled: true,
		filter: 'attributes.source == myservice',
		tags: ['server', 'app', 'host', 'realse'],
		operators: [
			{
				type: 'trace_parser',
				name: 'Parse trace details',
				id: 'parsetracedetails',
				output: 'removeoldxtrace_id',
				trace_id: {
					// Remove the keys if the user left them empty
					parse_from: 'attributes.xtrace_id',
				},
				span_id: {
					// Remove the keys if the user left them empty
					parse_from: 'attributes.xspan_id',
				},
				trace_flags: {
					// Remove the keys if the user left them empty
					parse_from: 'attributes.xtrace_flag',
				},
			},
			{
				type: 'remove',
				name: 'remove old xtrace_id',
				id: 'removeoldxtrace_id',
				field: 'attributes.xtrace_id',
				output: 'removeoldxspan_id',
			},
			{
				type: 'remove',
				name: 'remove old xspan_id',
				id: 'removeoldxspan_id',
				field: 'attributes.xspan_id',
				output: 'removeoldxtrace_flag',
			},
			{
				type: 'remove',
				name: 'remove old xtrace_flag',
				id: 'removeoldxtrace_flag',
				field: 'attributes.xtrace_flag',
			},
		],
	},
];

function ListOfPipelines({
	isActionType,
	setActionType,
}: ListOfPipelinesProps): JSX.Element {
	const { t } = useTranslation(['pipeline', 'common']);
	const formRef = useRef<FormInstance>(null);
	const [dataSource, setDataSource] = useState<Array<PipelineColumnType>>(
		pipelineData,
	);
	const [childDataSource, setChildDataSource] = useState<
		Array<SubPiplineColumsType>
	>();
	const [activeExpRow, setActiveExpRow] = useState<Array<number>>();
	const [selectedRecord, setSelectedRecord] = useState<PipelineColumnType>();
	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<SubPiplineColumsType>();

	const [modal, contextHolder] = Modal.useModal();
	const { Text } = Typography;

	const handleAlert = useCallback(
		({
			title,
			descrition,
			buttontext,
			onCancelClick,
			onOkClick,
		}: AlertMessageType) => {
			modal.confirm({
				title: (
					<Typography.Title level={1} style={modalTitleStyle}>
						{title}
					</Typography.Title>
				),
				icon: <ExclamationCircleOutlined />,
				content: <AlertContentWrapper>{descrition}</AlertContentWrapper>,
				okText: <Text>{buttontext}</Text>,
				cancelText: <Text>{t('cancel')}</Text>,
				onOk: onOkClick,
				onCancel: onCancelClick,
			});
		},
		[Text, modal, t],
	);

	const handlePipelineEditAction = (record: PipelineColumnType): void => {
		setActionType('edit-pipeline');
		setSelectedRecord(record);
	};

	const handleProcessorEditAction = (record: SubPiplineColumsType): void => {
		setActionType('edit-processor');
		setSelectedProcessorData(record);
	};

	const getCommonAction = (): JSX.Element => (
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

	const handleDelete = (record: PipelineColumnType): void => {
		const findElement = dataSource?.filter(
			(data) => data.orderid !== record.orderid,
		);
		setDataSource(findElement);
	};

	const pipelineColumns: ColumnsType<PipelineColumnType> = [
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
						<EditOutlined
							style={iconStyle}
							onClick={(): void => handlePipelineEditAction(record)}
						/>
					</span>
					<span>
						<EyeFilled style={iconStyle} />
					</span>
					<span>
						<DeleteFilled
							onClick={(): void =>
								handleAlert({
									title: `${t('delete_pipeline')} : ${record.name}?`,
									descrition: t('delete_pipeline_description'),
									buttontext: t('delete'),
									onOkClick: (): void => handleDelete(record),
								})
							}
							style={iconStyle}
						/>
					</span>
				</Space>
			),
		},
		{
			title: '',
			dataIndex: 'action',
			key: 'action',
			width: 80,
			render: (): JSX.Element => getCommonAction(),
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
		<ChildListOfProcessor
			getCommonAction={getCommonAction}
			handleAlert={handleAlert}
			setChildDataSource={setChildDataSource}
			childDataSource={childDataSource}
			setActionType={setActionType}
			handleProcessorEditAction={handleProcessorEditAction}
		/>
	);

	const getDataOnExpand = (
		expanded: boolean,
		record: PipelineColumnType,
	): void => {
		const keys = [];
		if (expanded) {
			keys.push(record.orderid);
		}
		setActiveExpRow(keys);
		const processorData = record.operators.map(
			(
				item: PipelineOperatorsType,
				index: number,
			): {
				id: number;
				text: string;
			} => ({
				id: index,
				text: item.name,
			}),
		);
		setChildDataSource(processorData);
	};

	const getExpandIcon = (
		expanded: boolean,
		onExpand: (
			record: PipelineColumnType,
			e: React.MouseEvent<HTMLElement>,
		) => void,
		record: PipelineColumnType,
	): JSX.Element => {
		if (expanded) {
			return <DownOutlined onClick={(e): void => onExpand(record, e)} />;
		}
		return <RightOutlined onClick={(e): void => onExpand(record, e)} />;
	};

	const getFooterElement = (): JSX.Element => (
		<Button
			type="link"
			onClick={(): void => setActionType('add-pipeline')}
			style={modalFooterStyle}
			icon={<PlusOutlined />}
		>
			{t('add_new_pipeline')}
		</Button>
	);

	const handleModalCancelAction = (): void => {
		setActionType(undefined);
		formRef?.current?.resetFields();
	};

	return (
		<div>
			{contextHolder}
			<Pipline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedRecord={selectedRecord}
				setDataSource={setDataSource}
				formRef={formRef}
				handleModalCancelAction={handleModalCancelAction}
				dataSource={dataSource}
			/>
			<Processor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				setChildDataSource={setChildDataSource as () => Array<SubPiplineColumsType>}
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
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						onRow={(_record, index): React.HTMLAttributes<any> => {
							const attr = {
								index,
								moveRow: movePipelineRow,
							};
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							return attr as React.HTMLAttributes<any>;
						}}
						footer={(): React.ReactElement => getFooterElement()}
					/>
				</DndProvider>
			</Container>
		</div>
	);
}

interface ListOfPipelinesProps {
	isActionType: string | undefined;
	setActionType: (b?: string) => void;
}

interface ActionBy {
	username: string;
	email: string;
}

interface ParseType {
	parse_from: string;
}

export interface PipelineOperatorsType {
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

export interface PipelineColumnType {
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
	tags: Array<string> | undefined;
	operators: Array<PipelineOperatorsType>;
}

export interface SubPiplineColumsType {
	id?: number | string;
	text: string;
}

export interface AlertMessageType {
	title: string;
	descrition: string;
	buttontext: string;
	onCancelClick?: VoidFunction;
	onOkClick?: VoidFunction;
}

export default ListOfPipelines;
