import {
	DeleteOutlined,
	EditOutlined,
	EyeOutlined,
	HolderOutlined,
} from '@ant-design/icons';
import { Avatar, List, Space, Switch, Table, Tag } from 'antd';
import useComponentPermission from 'hooks/useComponentPermission';
import update from 'immutability-helper';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Container } from './styles';
import { pipelineData } from './utils';

const type = 'DraggableBodyRow';

function DraggableBodyRow({
	index,
	moveRow,
	className,
	style,
	...restProps
}: DraggableBodyRowProps) {
	const ref = useRef<HTMLTableRowElement>(null);
	const [{ isOver, dropClassName }, drop] = useDrop({
		accept: type,
		collect: (monitor) => {
			const { index: dragIndex } = monitor.getItem() || {};
			if (dragIndex === index) {
				return {};
			}
			return {
				isOver: monitor.isOver(),
				dropClassName:
					dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
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
			className={`${className}${isOver ? dropClassName : ''}`}
			style={{ cursor: 'move', ...style }}
			{...restProps}
		/>
	);
}

function ListOfPipelines() {
	const [dataSource, setDataSource] = useState<any>([]);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [action] = useComponentPermission(['action'], role);

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
	}, [pipelineData]);

	const columns = [
		{
			title: '',
			dataIndex: 'id',
			key: 'id',
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
			render: (tags: any) => (
				<>
					{tags?.map((tag: any) => (
						<Tag color="blue" key={tag}>
							{tag}
						</Tag>
					))}
				</>
			),
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
			render: (): JSX.Element => (
				<Space size="middle">
					<a style={{ height: '24px', width: '24px' }}>
						<EditOutlined />
					</a>
					<a>
						<EyeOutlined />
					</a>
					<a>
						<DeleteOutlined />
					</a>
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
				<a>
					<Switch />
				</a>
				<a style={{ cursor: 'move' }}>
					<HolderOutlined />
				</a>
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
			setDataSource(
				update(dataSource, {
					$splice: [
						[dragIndex, 1],
						[hoverIndex, 0, dragRow],
					],
				}),
			);
		},
		[dataSource],
	);

	return (
		<div>
			<Container>
				<DndProvider backend={HTML5Backend}>
					<Table
						columns={columns}
						expandable={{
							expandedRowRender: (record) => (
								<p style={{ margin: 0 }}>
									<List
										size="small"
										itemLayout="horizontal"
										dataSource={record.description}
										style={{ gap: '20px' }}
										renderItem={(item: any, i) => (
											<List.Item
												actions={[
													<a key="list-loadmore-edit">
														<EditOutlined />
													</a>,
													<a key="list-loadmore-more">
														<EyeOutlined />
													</a>,
													<a key="list-loadmore-more">
														<DeleteOutlined />
													</a>,
													<Space size="middle">
														<a>
															<Switch />
														</a>
														<a style={{ cursor: 'move' }}>
															<HolderOutlined />
														</a>
													</Space>,
												]}
											>
												<div style={{ margin: '5px', padding: '5px' }}>
													<Avatar
														style={{ backgroundColor: '#1668dc' }}
														shape="square"
														size="small"
													>
														{i + 1}
													</Avatar>
												</div>
												<List.Item.Meta title={<p style={{ display: 'flex' }}>{item}</p>} />
											</List.Item>
										)}
									/>
								</p>
							),
							rowExpandable: (record) => record.pname !== 'Not Expandable',
						}}
						dataSource={dataSource}
						onRow={(_, index) => {
							const attr = {
								index,
								moveRow,
							};
							return attr as React.HTMLAttributes<any>;
						}}
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

export default ListOfPipelines;
