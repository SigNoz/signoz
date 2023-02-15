import { PlusCircleOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionType } from '../Layouts';
import { ModalFooterTitle } from '../styles';
import { AlertMessage, ProcessorColumn } from '.';
import {
	CopyFilledIcon,
	FooterButton,
	IconListStyle,
	ListDataStyle,
	ProcessorIndexIcon,
	SmallDeleteFilledIcon,
	SmallEditOutlinedIcon,
	StyledTable,
} from './styles';
import { getElementFromArray, getUpdatedRow } from './utils';

function PipelineExpandView({
	dragActionHandler,
	handleAlert,
	processorDataSource,
	setProcessorDataSource,
	setActionType,
	handleProcessorEditAction,
}: PipelineExpandViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();

	const processorDeleteHandler = useCallback(
		(record: ProcessorColumn) => (): void => {
			const findElement = getElementFromArray(processorDataSource, record, 'id');
			setProcessorDataSource(findElement);
		},
		[processorDataSource, setProcessorDataSource],
	);

	const handleProcessorDeleteAction = (record: ProcessorColumn) => (): void => {
		handleAlert({
			title: `${t('delete_processor')} : ${record.text}?`,
			descrition: t('delete_processor_description'),
			buttontext: t('delete'),
			onOk: processorDeleteHandler(record),
		});
	};

	const processorColumns: ColumnsType<ProcessorColumn> = [
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
						<SmallEditOutlinedIcon onClick={handleProcessorEditAction(record)} />
					</span>
					<span key="list-view">
						<SmallDeleteFilledIcon onClick={handleProcessorDeleteAction(record)} />
					</span>
					<span key="list-copy">
						<CopyFilledIcon />
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
			if (processorDataSource) {
				const rawData = processorDataSource;
				const updatedRow = getUpdatedRow(
					processorDataSource,
					dragIndex,
					hoverIndex,
				);

				handleAlert({
					title: t('reorder_processor'),
					descrition: t('reorder_processor_description'),
					buttontext: t('reorder'),
					onOk: (): void => setProcessorDataSource(updatedRow),
					onCancel: (): void => setProcessorDataSource(rawData),
				});
			}
		},
		[processorDataSource, handleAlert, setProcessorDataSource, t],
	);

	const onClickHandler = useCallback((): void => {
		setActionType(ActionType.AddProcessor);
	}, [setActionType]);

	const footer = useCallback(
		(): JSX.Element => (
			<FooterButton type="link" onClick={onClickHandler}>
				<PlusCircleOutlined />
				<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
			</FooterButton>
		),
		[onClickHandler, t],
	);

	return (
		<DndProvider backend={HTML5Backend}>
			<StyledTable
				isDarkMode={isDarkMode}
				showHeader={false}
				columns={processorColumns}
				size="small"
				components={tableComponents}
				dataSource={processorDataSource}
				pagination={false}
				onRow={(
					_record: ProcessorColumn,
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
	processorDataSource: Array<ProcessorColumn>;
	setProcessorDataSource: (value: Array<ProcessorColumn> | undefined) => void;
	setActionType: (actionType?: ActionType) => void;
	handleProcessorEditAction: (record: ProcessorColumn) => () => void;
}

export default PipelineExpandView;
