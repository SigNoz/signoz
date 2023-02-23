import { PlusCircleOutlined } from '@ant-design/icons';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
import { ModalFooterTitle } from '../styles';
import { AlertMessage, ProcessorColumn } from '.';
import { processorColumns } from './config';
import { FooterButton, StyledTable } from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import { getElementFromArray, getTableColumn, getUpdatedRow } from './utils';

function PipelineExpandView({
	handleAlert,
	processorDataSource,
	setProcessorDataSource,
	setActionType,
	handleProcessorEditAction,
	isActionMode,
	onDeleteClickHandler,
	setIsVisibleSaveButton,
}: PipelineExpandViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();

	const processorDeleteHandler = useCallback(
		(record: ProcessorColumn) => (): void => {
			const findElement = getElementFromArray(processorDataSource, record, 'id');
			onDeleteClickHandler();
			setProcessorDataSource(findElement);
		},
		[onDeleteClickHandler, processorDataSource, setProcessorDataSource],
	);

	const handleProcessorDeleteAction = useCallback(
		(record: ProcessorColumn) => (): void => {
			handleAlert({
				title: `${t('delete_processor')} : ${record.processorName}?`,
				descrition: t('delete_processor_description'),
				buttontext: t('delete'),
				onOk: processorDeleteHandler(record),
			});
		},
		[handleAlert, processorDeleteHandler, t],
	);

	const columns = useMemo(() => {
		const fieldColumns = getTableColumn(processorColumns);
		if (isActionMode === ActionMode.Editing) {
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
		}
		return fieldColumns;
	}, [handleProcessorDeleteAction, handleProcessorEditAction, isActionMode]);

	const updateProcessorRowData = useCallback(
		(updatedRow: ProcessorColumn[]) => (): void => {
			setIsVisibleSaveButton(ActionMode.Editing);
			setProcessorDataSource(updatedRow);
		},
		[setIsVisibleSaveButton, setProcessorDataSource],
	);

	const moveProcessorRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (processorDataSource && isActionMode === ActionMode.Editing) {
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
					onOk: updateProcessorRowData(updatedRow),
					onCancel: (): void => setProcessorDataSource(rawData),
				});
			}
		},
		[
			processorDataSource,
			isActionMode,
			handleAlert,
			t,
			updateProcessorRowData,
			setProcessorDataSource,
		],
	);

	const onClickHandler = useCallback((): void => {
		setActionType(ActionType.AddProcessor);
	}, [setActionType]);

	const footer = useCallback((): JSX.Element | undefined => {
		if (isActionMode === ActionMode.Editing) {
			return (
				<FooterButton type="link" onClick={onClickHandler}>
					<PlusCircleOutlined />
					<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
				</FooterButton>
			);
		}
		return undefined;
	}, [onClickHandler, t, isActionMode]);

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
	isActionMode: string;
	onDeleteClickHandler: VoidFunction;
	setIsVisibleSaveButton: (actionMode: ActionMode) => void;
}

export default PipelineExpandView;
