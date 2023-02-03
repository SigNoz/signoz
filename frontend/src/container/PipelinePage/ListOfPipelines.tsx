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
import useComponentPermission from 'hooks/useComponentPermission';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import update from 'react-addons-update';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import {
	deleteModalDescriptionStyle,
	iconStyle,
	ListiconStyle,
	modalFooterStyle,
	modalFooterTitle,
	modalTitleStyle,
	sublistDataStyle,
} from './config';
import NewPipline from './NewPipeline';
import NewProcessor from './NewProcessor';
import { Container } from './styles';
import { pipelineData } from './utils';

const type = 'DraggableBodyRow';

function DraggableBodyRow({
	index,
	moveRow,
	className,
	style,
	...restProps
}: DraggableBodyRowProps): JSX.Element {
	const ref = useRef<HTMLTableRowElement>(null);
	const [, drop] = useDrop({
		accept: type,
		collect: (monitor) => {
			const { index: dragIndex } = monitor.getItem() || {};
			if (dragIndex === index) {
				return {};
			}
			return {
				isOver: monitor.isOver(),
			};
		},
		drop: (item: { index: number }) => {
			moveRow(item.index, index);
		},
	});
	const [, drag] = useDrag({
		type,
		item: { index },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});
	drop(drag(ref));

	return (
		<tr
			ref={ref}
			className={className}
			style={{ ...style }}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...restProps}
		/>
	);
}

function ListOfPipelines(): JSX.Element {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [dataSource, setDataSource] = useState<any>([]);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [action] = useComponentPermission(['action'], role);
	const [newAddProcessor, setNewAddProcessor] = useState<boolean>(false);
	const [addNewPipline, setAddNewPipline] = useState<boolean>(false);
	const [isReorder, setReorder] = useState<boolean>(false);

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
	}, [newAddProcessor]);

	const WarningMessageModal = useCallback(
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
					<Avatar style={ListiconStyle} size="small">
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

	if (action) {
		columns.push({
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
			align: 'center',
			render: (): JSX.Element => (
				<Space size="middle">
					<span>
						<EditOutlined style={iconStyle} />
					</span>
					<span>
						<EyeFilled style={iconStyle} />
					</span>
					<span>
						<DeleteFilled
							onClick={(): void =>
								WarningMessageModal({
									title: 'Do you want to delete pipeline : Pipeline Name?',
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
			row: DraggableBodyRow,
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
			setDataSource(isReorder ? updatedRow : dataSource);

			if (dragRow) {
				WarningMessageModal({
					title: 'Do you want to reorder pipeline?',
					descrition:
						'Logs are processed sequentially in processors and pipelines. Reordering it may change how data is processed by them.',
					buttontext: 'Reorder',
					onOkClick: (): void => setReorder(true),
					onCancelClick: (): void => setReorder(false),
				});
			}
		},
		[WarningMessageModal, dataSource, isReorder, setReorder, setDataSource],
	);

	function FooterData(): React.ReactElement {
		return (
			<div>
				<Button
					type="link"
					onClick={(): void => setAddNewPipline(true)}
					style={modalFooterStyle}
					icon={<PlusOutlined />}
				>
					Add a New Pipeline
				</Button>
			</div>
		);
	}

	return (
		<div>
			{contextHolder}
			{newAddProcessor && (
				<NewProcessor
					newAddProcessor={newAddProcessor}
					setNewAddProcessor={setNewAddProcessor}
				/>
			)}
			{addNewPipline && (
				<NewPipline
					addPipeline={addNewPipline}
					setNewAddPiplines={setAddNewPipline}
				/>
			)}
			<Container>
				<DndProvider backend={HTML5Backend}>
					<Table
						columns={columns}
						expandable={{
							expandedRowRender: (record: ValueType): React.ReactNode => (
								<div
									style={{
										margin: '0 60px',
									}}
								>
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
														<EditOutlined style={iconStyle} />
													</span>,
													<span key="list-view">
														<EyeFilled style={iconStyle} />
													</span>,
													<span key="list-delete">
														<CopyFilled style={iconStyle} />
													</span>,
													<Space size="middle" key={index + Math.random()}>
														<>
															<span>
																<Switch />
															</span>
															<span style={{ cursor: 'move' }}>
																<HolderOutlined />
															</span>
														</>
													</Space>,
												]}
											>
												<div style={{ margin: '5px', padding: '5px' }}>
													<Avatar style={sublistDataStyle} size="small">
														{index + 1}
													</Avatar>
												</div>
												<List.Item.Meta
													title={
														<p
															style={{
																display: 'flex',
																fontStyle: 'normal',
																fontWeight: 400,
																fontSize: '13px',
																lineHeight: '20px',
															}}
														>
															{item}
														</p>
													}
												/>
											</List.Item>
										)}
									/>
									<div>
										<Button
											type="link"
											style={modalFooterStyle}
											onClick={(): void => setNewAddProcessor(true)}
										>
											<PlusCircleOutlined />
											<span style={modalFooterTitle}>Add Processor</span>
										</Button>
									</div>
								</div>
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

interface DraggableBodyRowProps
	extends React.HTMLAttributes<HTMLTableRowElement> {
	index: number;
	moveRow: (dragIndex: number, hoverIndex: number) => void;
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
