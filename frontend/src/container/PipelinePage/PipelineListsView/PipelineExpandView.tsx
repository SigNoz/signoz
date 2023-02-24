import { PlusCircleOutlined } from '@ant-design/icons';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { DeleteProcessorData, ProcessorDataAdd } from 'store/actions';
import { AppState } from 'store/reducers';
import { PiplineReducerType } from 'store/reducers/pipeline';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
import { ModalFooterTitle } from '../styles';
import { AlertMessage, ProcessorColumn } from '.';
import { processorColumns } from './config';
import { FooterButton, StyledTable } from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import { getTableColumn, getUpdatedRow } from './utils';

function PipelineExpandView({
	handleAlert,
	setActionType,
	handleProcessorEditAction,
	isActionMode,
	onDeleteClickHandler,
	setIsVisibleSaveButton,
}: PipelineExpandViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();
	const dispatch = useDispatch();

	const { processorData } = useSelector<AppState, PiplineReducerType>(
		(state) => state.pipeline,
	);

	const processorDeleteHandler = useCallback(
		(record: ProcessorColumn) => (): void => {
			onDeleteClickHandler();
			dispatch(DeleteProcessorData(processorData, record));
		},
		[dispatch, onDeleteClickHandler, processorData],
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
		(updatedRow: Array<ProcessorColumn>) => (): void => {
			setIsVisibleSaveButton(ActionMode.Editing);
			dispatch(ProcessorDataAdd(updatedRow));
		},
		[dispatch, setIsVisibleSaveButton],
	);

	const onCancelPiplineExpand = useCallback(
		(rawData: Array<ProcessorColumn>) => (): void => {
			dispatch(ProcessorDataAdd(rawData));
		},
		[dispatch],
	);

	const moveProcessorRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (processorData && isActionMode === ActionMode.Editing) {
				const rawData = processorData;
				const updatedRow = getUpdatedRow(processorData, dragIndex, hoverIndex);

				handleAlert({
					title: t('reorder_processor'),
					descrition: t('reorder_processor_description'),
					buttontext: t('reorder'),
					onOk: updateProcessorRowData(updatedRow),
					onCancel: onCancelPiplineExpand(rawData),
				});
			}
		},
		[
			handleAlert,
			isActionMode,
			onCancelPiplineExpand,
			processorData,
			t,
			updateProcessorRowData,
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
				dataSource={processorData}
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
	setActionType: (actionType?: ActionType) => void;
	handleProcessorEditAction: (record: ProcessorColumn) => () => void;
	isActionMode: string;
	onDeleteClickHandler: VoidFunction;
	setIsVisibleSaveButton: (actionMode: ActionMode) => void;
}

export default PipelineExpandView;
