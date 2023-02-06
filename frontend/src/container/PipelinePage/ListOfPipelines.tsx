/* eslint-disable react/no-unstable-nested-components */
import {
	CopyFilled,
	DeleteFilled,
	DownOutlined,
	EditOutlined,
	ExclamationCircleOutlined,
	EyeFilled,
	HolderOutlined,
	PlusCircleOutlined,
	PlusOutlined,
	RightOutlined,
} from '@ant-design/icons';
import {
	Avatar,
	Button,
	List,
	Modal,
	Space,
	Switch,
	Table,
	Tag,
	Typography,
} from 'antd';
import { ColumnProps } from 'antd/es/table';
import { ColumnsType } from 'antd/lib/table';
import DraggableTableRow from 'components/DraggableTableRow';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { useCallback, useEffect, useState } from 'react';
import update from 'react-addons-update';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import {
	deleteModalDescriptionStyle,
	iconStyle,
	listIconStyle,
	listItemTitleStyle,
	modalFooterStyle,
	modalFooterTitle,
	modalTitleStyle,
	sublistDataStyle,
} from './config';
import Pipline from './Pipeline';
import Processor from './Processor';
import { Container } from './styles';
import { pipelineData } from './utils';

function ListOfPipelines({
	isActionType,
	setActionType,
}: {
	isActionType: string | undefined;
	setActionType: (b: string | undefined) => void;
}): JSX.Element {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [dataSource, setDataSource] = useState<any>([]);
	const [selectedRecord, setSelectedRecord] = useState<string>('');
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [action] = useComponentPermission(['action'], role);

	const [modal, contextHolder] = Modal.useModal();
	const { Text } = Typography;

	useEffect(() => {
		const updatedData = pipelineData?.map((e) => ({
			id: String(e.id),
			key: e.key,
			pipelineName: e.pname,
			filter: e.filter,
			tags: e.Tags,
			lastEdited: e.last_edited,
			editedBy: e.EditedBy,
			description: e.description,
		}));
		setDataSource(updatedData);
	}, []);

	const handleAlert = useCallback(
		({
			title,
			descrition,
			buttontext,
			onCancelClick,
			onOkClick,
		}: {
			title: string;
			descrition: string;
			buttontext: string;
			onCancelClick?: () => void;
			onOkClick?: () => void;
		}) => {
			modal.confirm({
				title: (
					<Typography.Title level={1} style={modalTitleStyle}>
						{title}
					</Typography.Title>
				),
				icon: <ExclamationCircleOutlined />,
				content: <Text style={deleteModalDescriptionStyle}>{descrition}</Text>,
				okText: <Text>{buttontext}</Text>,
				cancelText: <Text>Cancel</Text>,
				onOk: onOkClick,
				onCancel: onCancelClick,
				// centered: true,
			});
		},
		[Text, modal],
	);

	const columns: ColumnsType<PipelineColumn> = [
		{
			title: '',
			dataIndex: 'id',
			key: 'id',
			render: (i: number): JSX.Element => (
				<div>
					<Avatar style={listIconStyle} size="small">
						{i}
					</Avatar>
				</div>
			),
		},
		{
			title: 'Pipeline Name',
			dataIndex: 'pipelineName',
			key: 'pipelineName',
		},
		{
			title: 'Filters',
			dataIndex: 'filter',
			key: 'filter',
		},
		{
			title: 'Tags',
			dataIndex: 'tags',
			key: 'tags',
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
		},
		{
			title: 'Edited By',
			dataIndex: 'editedBy',
			key: 'editedBy',
		},
	];

	const handlePipelineEditAction = (record: PipelineColumn): void => {
		setActionType('edit-pipeline');
		setSelectedRecord(record.pipelineName);
	};

	if (action) {
		columns.push({
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
			align: 'center',
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
									title: `Do you want to delete pipeline : ${record.pipelineName}?`,
									descrition:
										'Logs are processed sequentially in processors and pipelines. Deleting a pipeline may change content of data processed by other pipelines & processors',
									buttontext: 'Delete',
								})
							}
							style={iconStyle}
						/>
					</span>
				</Space>
			),
		});
	}

	columns.push({
		title: '',
		dataIndex: 'action',
		key: 'action',
		render: (): JSX.Element => (
			<div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
				<span>
					<Switch />
				</span>
				<span style={{ cursor: 'move' }}>
					<HolderOutlined style={iconStyle} />
				</span>
			</div>
		),
	});

	const components = {
		body: {
			row: DraggableTableRow,
		},
	};

	const moveRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			const dragRow = dataSource[dragIndex];
			const updatedRow = update(dataSource, {
				$splice: [
					[dragIndex, 1],
					[hoverIndex, 0, dragRow],
				],
			});

			if (dragRow) {
				handleAlert({
					title: 'Do you want to reorder pipeline?',
					descrition:
						'Logs are processed sequentially in processors and pipelines. Reordering it may change how data is processed by them.',
					buttontext: 'Reorder',
					onOkClick: (): void => setDataSource(updatedRow),
					onCancelClick: (): void => setDataSource(dataSource),
				});
			}
		},
		[handleAlert, dataSource, setDataSource],
	);

	function FooterData(): React.ReactElement {
		return (
			<div>
				<Button
					type="link"
					onClick={(): void => setActionType('add-pipeline')}
					style={modalFooterStyle}
					icon={<PlusOutlined />}
				>
					Add a New Pipeline
				</Button>
			</div>
		);
	}

	const handleProcessorEditAction = (record: string): void => {
		setActionType('edit-processor');
		setSelectedRecord(record);
	};

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
						columns={columns}
						expandable={{
							expandedRowRender: (record: ValueType): React.ReactNode => (
								<>
									<List
										size="small"
										itemLayout="horizontal"
										dataSource={record.description}
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										renderItem={(item: any, index: number): JSX.Element => (
											<List.Item
												key={index}
												actions={[
													<span key="list-edit">
														<EditOutlined
															style={iconStyle}
															onClick={(): void => handleProcessorEditAction(item)}
														/>
													</span>,
													<span key="list-view">
														<EyeFilled style={iconStyle} />
													</span>,
													<span key="list-copy">
														<CopyFilled style={iconStyle} />
													</span>,
													<Space size="middle" key={index + Math.random()}>
														<span style={{ cursor: 'move' }}>
															<HolderOutlined />
														</span>
													</Space>,
												]}
											>
												<div style={{ margin: '5px', padding: '5px' }}>
													<Avatar style={sublistDataStyle} size="small">
														{index + 1}
													</Avatar>
												</div>
												<List.Item.Meta title={<p style={listItemTitleStyle}>{item}</p>} />
											</List.Item>
										)}
									/>
									<Button
										type="link"
										style={modalFooterStyle}
										onClick={(): void => setActionType('add-processor')}
									>
										<PlusCircleOutlined />
										<span style={modalFooterTitle}>Add Processor</span>
									</Button>
								</>
							),
							rowExpandable: (record): boolean =>
								record.pipelineName !== 'Not Expandable',
							expandIcon: ({ expanded, onExpand, record }): JSX.Element =>
								expanded ? (
									<DownOutlined onClick={(e): void => onExpand(record, e)} />
								) : (
									<RightOutlined onClick={(e): void => onExpand(record, e)} />
								),
						}}
						components={components}
						dataSource={dataSource}
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						onRow={(_record, index): React.HTMLAttributes<any> => {
							const attr = {
								index,
								moveRow,
							};
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							return attr as React.HTMLAttributes<any>;
						}}
						footer={(): React.ReactElement => <FooterData />}
					/>
				</DndProvider>
			</Container>
		</div>
	);
}

interface PipelineColumn extends ColumnProps<PipelineColumn> {
	id: string;
	pipelineName: string;
	filter: number;
	address: string;
	tags: () => React.ReactElement;
	lastEdited: string;
	editedBy: string;
	description: Array<string>;
}

interface ValueType {
	id: string;
	pipelineName: string;
	lastEdited: string;
	editedBy: string;
	description: Array<string>;
}
export default ListOfPipelines;
