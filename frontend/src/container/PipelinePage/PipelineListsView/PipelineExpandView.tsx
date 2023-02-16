import { PlusCircleOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionType } from '../Layouts';
import { ModalFooterTitle } from '../styles';
import { AlertMessage, ProcessorColumn } from '.';
import { processorColumns } from './config';
import {
	FooterButton,
	ListDataStyle,
	ProcessorIndexIcon,
	StyledTable,
} from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import { getElementFromArray, getUpdatedRow } from './utils';

function PipelineExpandView({
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

	const handleProcessorDeleteAction = useCallback(
		(record: ProcessorColumn) => (): void => {
			handleAlert({
				title: `${t('delete_processor')} : ${record.text}?`,
				descrition: t('delete_processor_description'),
				buttontext: t('delete'),
				onOk: processorDeleteHandler(record),
			});
		},
		[handleAlert, processorDeleteHandler, t],
	);

	const getRenderMethod = useCallback(
		(
			key?: string | number,
			record?: string | number | undefined,
		): React.ReactElement => {
			if (key === 'id') {
				return (
					<ProcessorIndexIcon size="small">{Number(record) + 1}</ProcessorIndexIcon>
				);
			}
			if (key === 'text') {
				return <ListDataStyle>{record}</ListDataStyle>;
			}
			return <span>{record}</span>;
		},
		[],
	);

	const columns = useMemo(() => {
		const fieldColumns: ColumnsType<ProcessorColumn> = processorColumns.map(
			({ title, key }) => ({
				title,
				dataIndex: key,
				key,
				align: key === 'id' ? 'right' : 'left',
				render: (record): React.ReactNode => getRenderMethod(key, record),
			}),
		);
		fieldColumns.push(
			{
				title: '',
				dataIndex: 'action',
				key: 'action',
				render: (_value, record): JSX.Element => (
					<PipelineActions
						isPipelineAction={false}
						editAction={handleProcessorEditAction(record)}
						deleteAction={handleProcessorDeleteAction(record)}
					/>
				),
			},
			{
				title: '',
				dataIndex: 'dragAction',
				key: 'dragAction',
				render: () => <DragAction />,
			},
		);
		return fieldColumns;
	}, [getRenderMethod, handleProcessorDeleteAction, handleProcessorEditAction]);

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
				columns={columns}
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
	handleAlert: (props: AlertMessage) => void;
	processorDataSource: Array<ProcessorColumn>;
	setProcessorDataSource: (value: Array<ProcessorColumn> | undefined) => void;
	setActionType: (actionType?: ActionType) => void;
	handleProcessorEditAction: (record: ProcessorColumn) => () => void;
}

export default PipelineExpandView;
