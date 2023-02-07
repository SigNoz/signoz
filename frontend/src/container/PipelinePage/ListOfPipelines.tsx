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
import { ColumnsType } from 'antd/lib/table';
import DraggableTableRow from 'components/DraggableTableRow';
import { themeColors } from 'constants/theme';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { useCallback, useState } from 'react';
import update from 'react-addons-update';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import {
	iconStyle,
	modalFooterStyle,
	modalTitleStyle,
	sublistDataStyle,
} from './config';
import Pipline from './Pipeline';
import Processor from './Processor';
import {
	AlertContentWrapper,
	Container,
	ListItemTitleWrapper,
	ModalFooterTitle,
} from './styles';
import { pipelineData } from './utils';

function ListOfPipelines({
	isActionType,
	setActionType,
}: {
	isActionType: string | undefined;
	setActionType: (b: string | undefined) => void;
}): JSX.Element {
	const [dataSource, setDataSource] = useState<Array<PipelineColumnType>>(
		pipelineData,
	);
	const [selectedRecord, setSelectedRecord] = useState<string>('');
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const { t } = useTranslation(['common']);
	const [action] = useComponentPermission(['action'], role);

	const [modal, contextHolder] = Modal.useModal();
	const { Text } = Typography;

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
				content: <AlertContentWrapper>{descrition}</AlertContentWrapper>,
				okText: <Text>{buttontext}</Text>,
				cancelText: <Text>{t('cancel')}</Text>,
				onOk: onOkClick,
				onCancel: onCancelClick,
			});
		},
		[Text, modal, t],
	);

	const columns: ColumnsType<PipelineColumnType> = [
		{
			title: '',
			dataIndex: 'id',
			key: 'id',
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

	const handlePipelineEditAction = (record: PipelineColumnType): void => {
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
					title: t('reorder_pipeline'),
					descrition: t('reorder_pipeline_description'),
					buttontext: t('reorder'),
					onOkClick: (): void => setDataSource(updatedRow),
					onCancelClick: (): void => setDataSource(dataSource),
				});
			}
		},
		[handleAlert, dataSource, setDataSource, t],
	);

	// eslint-disable-next-line react/no-unstable-nested-components
	function FooterData(): React.ReactElement {
		return (
			<div>
				<Button
					type="link"
					onClick={(): void => setActionType('add-pipeline')}
					style={modalFooterStyle}
					icon={<PlusOutlined />}
				>
					{t('add_new_pipeline')}
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
							// eslint-disable-next-line react/no-unstable-nested-components
							expandedRowRender: (record: PipelineColumnType): React.ReactNode => (
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
												<List.Item.Meta
													title={<ListItemTitleWrapper>{item}</ListItemTitleWrapper>}
												/>
											</List.Item>
										)}
									/>
									<Button
										type="link"
										style={modalFooterStyle}
										onClick={(): void => setActionType('add-processor')}
									>
										<PlusCircleOutlined />
										<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
									</Button>
								</>
							),
							rowExpandable: (record): boolean =>
								record.pipelineName !== 'Not Expandable',
							// eslint-disable-next-line react/no-unstable-nested-components
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
						// eslint-disable-next-line react/no-unstable-nested-components
						footer={(): React.ReactElement => <FooterData />}
					/>
				</DndProvider>
			</Container>
		</div>
	);
}

export interface PipelineColumnType {
	id: string;
	key: number;
	pipelineName: string;
	filter: string;
	tags: Array<string>;
	lastEdited: string;
	editedBy: string;
	description: Array<string>;
}
export default ListOfPipelines;
