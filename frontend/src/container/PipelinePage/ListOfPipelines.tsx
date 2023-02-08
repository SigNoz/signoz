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
import { ColumnsType } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import React, { useCallback, useState } from 'react';
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
import { pipelineData } from './utils';

function ListOfPipelines({
	isActionType,
	setActionType,
}: ListOfPipelinesProps): JSX.Element {
	const [dataSource, setDataSource] = useState<Array<PipelineColumnType>>(
		pipelineData,
	);
	const [childDataSource, setChildDataSource] = useState<
		Array<SubPiplineColumsType>
	>();
	const [activeExpRow, setActiveExpRow] = React.useState<Array<string>>();
	const [selectedRecord, setSelectedRecord] = useState<string>('');
	const { t } = useTranslation(['common']);

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
		setSelectedRecord(record.pipelineName);
	};

	const handleProcessorEditAction = (record: string): void => {
		setActionType('edit-processor');
		setSelectedRecord(record);
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

	const pipelineColumns: ColumnsType<PipelineColumnType> = [
		{
			title: '',
			dataIndex: 'id',
			key: 'id',
			width: 10,
			render: (i: number): JSX.Element => (
				<Avatar style={{ background: themeColors.navyBlue }} size="small">
					{i}
				</Avatar>
			),
		},
		{
			title: 'Pipeline Name',
			dataIndex: 'pipelineName',
			key: 'pipelineName',
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
			width: 80,
			render: (value): React.ReactNode =>
				value?.map((tag: string) => (
					<Tag color="blue" key={tag}>
						{tag}
					</Tag>
				)),
		},
		{
			title: 'Last Edited',
			dataIndex: 'lastEdited',
			key: 'lastEdited',
			width: 50,
		},
		{
			title: 'Edited By',
			dataIndex: 'editedBy',
			key: 'editedBy',
			width: 50,
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
									title: `${t('delete_pipeline')} : ${record.pipelineName}?`,
									descrition: t('delete_pipeline_description'),
									buttontext: t('delete'),
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
			keys.push(record.id);
		}
		setActiveExpRow(keys);
		const processorData = record.description.map((item, index): {
			id: number;
			text: string;
		} => ({
			id: index,
			text: item,
		}));
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

	return (
		<div>
			{contextHolder}
			<Pipline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedRecord={selectedRecord}
			/>
			<Processor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedRecord={selectedRecord}
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
							key: item.id,
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
	setActionType: (b: string | undefined) => void;
}

export interface PipelineColumnType {
	id: string;
	key: number | string;
	pipelineName: string;
	filter: string;
	tags: Array<string>;
	lastEdited: string;
	editedBy: string;
	description: Array<string>;
}

export interface SubPiplineColumsType {
	id: number;
	text: string;
}

export interface AlertMessageType {
	title: string;
	descrition: string;
	buttontext: string;
	onCancelClick?: () => void;
	onOkClick?: () => void;
}

export default ListOfPipelines;
