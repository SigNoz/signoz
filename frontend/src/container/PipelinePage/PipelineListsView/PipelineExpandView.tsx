import {
	CopyFilled,
	DeleteFilled,
	EditOutlined,
	PlusCircleOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback } from 'react';
import update from 'react-addons-update';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionType } from '../Layouts';
import {
	FooterButton,
	IconListStyle,
	ListDataStyle,
	ModalFooterTitle,
	ProcessorIndexIcon,
	StyledTable,
} from '../styles';
import { AlertMessage, SubPiplineColums } from '.';

function PipelineExpandView({
	dragActionHandler,
	handleAlert,
	childDataSource,
	setChildDataSource,
	setActionType,
	handleProcessorEditAction,
}: PipelineExpandViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();

	const handleDelete = (record: SubPiplineColums) => (): void => {
		const findElement = childDataSource?.filter((data) => data.id !== record.id);
		setChildDataSource(findElement);
	};

	const handleProcessorDeleteAction = (record: SubPiplineColums) => (): void => {
		handleAlert({
			title: `${t('delete_processor')} : ${record.text}?`,
			descrition: t('delete_processor_description'),
			buttontext: t('delete'),
			onOkClick: handleDelete(record),
		});
	};

	const subcolumns: ColumnsType<SubPiplineColums> = [
		{
			title: '',
			dataIndex: 'id',
			key: 'id',
			width: 30,
			align: 'right',
			render: (index: number): JSX.Element => (
				<ProcessorIndexIcon size="small">{index + 1}</ProcessorIndexIcon>
			),
		},
		{
			title: '',
			dataIndex: 'text',
			key: 'list',
			width: 10,
			render: (item: string): JSX.Element => <ListDataStyle>{item}</ListDataStyle>,
		},
		{
			title: '',
			dataIndex: 'action',
			key: 'action',
			width: 10,
			render: (_value, record): JSX.Element => (
				<IconListStyle>
					<span key="list-edit">
						<EditOutlined
							style={{ color: themeColors.gainsboro, fontSize: '1rem' }}
							onClick={handleProcessorEditAction(record)}
						/>
					</span>
					<span key="list-view">
						<DeleteFilled
							onClick={handleProcessorDeleteAction(record)}
							style={{ color: themeColors.gainsboro, fontSize: '1rem' }}
						/>
					</span>
					<span key="list-copy">
						<CopyFilled style={{ color: themeColors.gainsboro, fontSize: '1rem' }} />
					</span>
				</IconListStyle>
			),
		},
		{
			title: '',
			dataIndex: 'dragAction',
			key: 'drag-action',
			width: 10,
			render: dragActionHandler,
		},
	];

	const moveProcessorRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			const rawData = childDataSource;
			const dragRows = childDataSource?.[dragIndex];
			if (childDataSource) {
				const updatedRows = update(childDataSource, {
					$splice: [
						[dragIndex, 1],
						[hoverIndex, 0, dragRows],
					],
				});
				if (dragRows) {
					handleAlert({
						title: t('reorder_processor'),
						descrition: t('reorder_processor_description'),
						buttontext: t('reorder'),
						onOkClick: (): void => setChildDataSource(updatedRows),
						onCancelClick: (): void => setChildDataSource(rawData),
					});
				}
			}
		},
		[childDataSource, handleAlert, setChildDataSource, t],
	);

	const onClickHandler = (): void => {
		setActionType(ActionType.AddProcessor);
	};

	const footer = (): JSX.Element => (
		<FooterButton type="link" onClick={onClickHandler}>
			<PlusCircleOutlined />
			<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
		</FooterButton>
	);

	return (
		<DndProvider backend={HTML5Backend}>
			<StyledTable
				isDarkMode={isDarkMode}
				showHeader={false}
				columns={subcolumns}
				size="small"
				components={tableComponents}
				dataSource={childDataSource}
				pagination={false}
				onRow={(
					_record: SubPiplineColums,
					index?: number,
				): React.HTMLAttributes<unknown> => {
					const attr = {
						index,
						moveRow: moveProcessorRow,
					};
					return attr as React.HTMLAttributes<unknown>;
				}}
				footer={footer}
			/>
		</DndProvider>
	);
}

interface PipelineExpandViewProps {
	dragActionHandler: () => JSX.Element;
	handleAlert: (props: AlertMessage) => void;
	childDataSource: Array<SubPiplineColums> | undefined;
	setActionType: (actionType?: ActionType) => void;
	setChildDataSource: (value: Array<SubPiplineColums> | undefined) => void;
	handleProcessorEditAction: (record: SubPiplineColums) => () => void;
}

export default PipelineExpandView;
