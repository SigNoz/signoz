import { PlusCircleOutlined } from '@ant-design/icons';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
import { ModalFooterTitle } from '../styles';
import { processorColumns } from './config';
import { FooterButton, StyledTable } from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import {
	AlertMessage,
	PipelineColumn,
	PipelineOperators,
	ProcessorColumn,
} from './types';
import { getTableColumn, getUpdatedRow } from './utils';

function PipelineExpandView({
	handleAlert,
	setActionType,
	processorEditAction,
	isActionMode,
	setShowSaveButton,
	expandedPipelineData,
	setExpandedPipelineData,
	processorData,
}: PipelineExpandViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();

	const deleteProcessorHandler = useCallback(
		(record: ProcessorColumn) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			if (expandedPipelineData) {
				const filteredProcessorData = expandedPipelineData?.operators.filter(
					(item: PipelineOperators) => item.id !== record.id,
				);
				const modifiedProcessorData = { ...expandedPipelineData };
				modifiedProcessorData.operators = filteredProcessorData;
				setExpandedPipelineData(modifiedProcessorData);
			}
		},
		[expandedPipelineData, setShowSaveButton, setExpandedPipelineData],
	);

	const processorDeleteAction = useCallback(
		(record: ProcessorColumn) => (): void => {
			handleAlert({
				title: `${t('delete_processor')} : ${record.name}?`,
				descrition: t('delete_processor_description'),
				buttontext: t('delete'),
				onOk: deleteProcessorHandler(record),
			});
		},
		[handleAlert, deleteProcessorHandler, t],
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
							editAction={processorEditAction(record)}
							deleteAction={processorDeleteAction(record)}
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
	}, [processorDeleteAction, processorEditAction, isActionMode]);

	const reorderProcessorRow = useCallback(
		(updatedRow: PipelineOperators[]) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			if (expandedPipelineData) {
				const modifiedProcessorData = { ...expandedPipelineData };
				modifiedProcessorData.operators = updatedRow;
				setExpandedPipelineData(modifiedProcessorData);
			}
		},
		[expandedPipelineData, setShowSaveButton, setExpandedPipelineData],
	);

	const onCancelReorderProcessorRow = useCallback(
		() => (): void => {
			if (expandedPipelineData) setExpandedPipelineData(expandedPipelineData);
		},
		[expandedPipelineData, setExpandedPipelineData],
	);

	const moveProcessorRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (expandedPipelineData?.operators && isActionMode === ActionMode.Editing) {
				const updatedRow = getUpdatedRow(
					expandedPipelineData?.operators,
					dragIndex,
					hoverIndex,
				);

				handleAlert({
					title: t('reorder_processor'),
					descrition: t('reorder_processor_description'),
					buttontext: t('reorder'),
					onOk: reorderProcessorRow(updatedRow),
					onCancel: onCancelReorderProcessorRow(),
				});
			}
		},
		[
			t,
			handleAlert,
			isActionMode,
			reorderProcessorRow,
			onCancelReorderProcessorRow,
			expandedPipelineData?.operators,
		],
	);

	const addNewProcessorHandler = useCallback((): void => {
		setActionType(ActionType.AddProcessor);
	}, [setActionType]);

	const footer = useCallback((): JSX.Element | undefined => {
		if (isActionMode === ActionMode.Editing) {
			return (
				<FooterButton type="link" onClick={addNewProcessorHandler}>
					<PlusCircleOutlined />
					<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
				</FooterButton>
			);
		}
		return undefined;
	}, [addNewProcessorHandler, t, isActionMode]);

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
	processorEditAction: (record: ProcessorColumn) => () => void;
	isActionMode: string;
	setShowSaveButton: (actionMode: ActionMode) => void;
	expandedPipelineData: PipelineColumn | undefined;
	setExpandedPipelineData: (data: PipelineColumn) => void;
	processorData: Array<ProcessorColumn> | undefined;
}

export default PipelineExpandView;
