import {
	DeleteFilled,
	EditOutlined,
	EyeFilled,
	HolderOutlined,
} from '@ant-design/icons';
import { Avatar, List, Space, Switch, Table, Tag } from 'antd';
import { themeColors } from 'constants/theme';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import update from 'react-addons-update';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { iconStyle } from './config';
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
			style={{ cursor: 'move', ...style }}
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const columns: any = [
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			render: (tags: any): void =>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				tags?.map((tag: any) => (
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
			render: (): JSX.Element => (
				<Space size="middle">
					<span style={{ height: '24px', width: '24px' }}>
						<EditOutlined style={iconStyle} />
					</span>
					<span>
						<EyeFilled style={iconStyle} />
					</span>
					<span>
						<DeleteFilled style={iconStyle} />
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
							// eslint-disable-next-line react/no-unstable-nested-components
							expandedRowRender: (record): JSX.Element => (
								<p style={{ margin: 0 }}>
									<List
										size="small"
										itemLayout="horizontal"
										dataSource={record.description}
										style={{ gap: '20px' }}
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										renderItem={(item: any, index: number): JSX.Element => (
											<List.Item
												key={index}
												actions={[
													<span key="list-loadmore-edit">
														<EditOutlined style={iconStyle} />
													</span>,
													<span key="list-loadmore-more">
														<EyeFilled style={iconStyle} />
													</span>,
													<span key="list-loadmore-more">
														<DeleteFilled style={iconStyle} />
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
													<Avatar
														style={{ backgroundColor: themeColors.navyBlue }}
														shape="square"
														size="small"
													>
														{index + 1}
													</Avatar>
												</div>
												<List.Item.Meta title={<p style={{ display: 'flex' }}>{item}</p>} />
											</List.Item>
										)}
									/>
								</p>
							),
							rowExpandable: (record): boolean => record.pname !== 'Not Expandable',
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
