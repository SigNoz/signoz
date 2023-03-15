import { PlusCircleOutlined } from '@ant-design/icons';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { PipelineData, ProcessorData } from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import { tableComponents } from '../config';
import { ActionMode, ActionType } from '../Layouts';
import { ModalFooterTitle } from '../styles';
import { AlertMessage } from '.';
import { processorColumns } from './config';
import { FooterButton, StyledTable } from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import {
	getEditedDataSource,
	getRecordIndex,
	getTableColumn,
	getUpdatedRow,
} from './utils';

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
		(record: ProcessorData) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			if (expandedPipelineData && expandedPipelineData?.config) {
				const filteredProcessorData = expandedPipelineData?.config.filter(
					(item: ProcessorData) => item.id !== record.id,
				);
				const modifiedProcessorData = { ...expandedPipelineData };
				modifiedProcessorData.config = filteredProcessorData;
				setExpandedPipelineData(modifiedProcessorData);
			}
		},
		[expandedPipelineData, setShowSaveButton, setExpandedPipelineData],
	);

	const processorDeleteAction = useCallback(
		(record: ProcessorData) => (): void => {
			handleAlert({
				title: `${t('delete_processor')} : ${record.name}?`,
				descrition: t('delete_processor_description'),
				buttontext: t('delete'),
				onOk: deleteProcessorHandler(record),
			});
		},
		[handleAlert, deleteProcessorHandler, t],
	);

	const onSwitchProcessorChange = useCallback(
		(checked: boolean, record: ProcessorData): void => {
			if (expandedPipelineData && expandedPipelineData?.config) {
				setShowSaveButton(ActionMode.Editing);
				const findRecordIndex = getRecordIndex(
					expandedPipelineData?.config,
					record,
					'name',
				);
				const updateSwitch = {
					...expandedPipelineData?.config[findRecordIndex],
					enabled: checked,
				};
				const editedData = getEditedDataSource(
					expandedPipelineData?.config,
					record,
					'name',
					updateSwitch,
				);
				const modifiedProcessorData = { ...expandedPipelineData };
				modifiedProcessorData.config = editedData;

				setExpandedPipelineData(modifiedProcessorData);
			}
		},
		[expandedPipelineData, setExpandedPipelineData, setShowSaveButton],
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
					dataIndex: 'enabled',
					key: 'enabled',
					render: (value, record) => (
						<DragAction
							isEnabled={value}
							onChange={(checked: boolean): void =>
								onSwitchProcessorChange(checked, record)
							}
						/>
					),
				},
			);
		}
		return fieldColumns;
	}, [
		isActionMode,
		processorEditAction,
		processorDeleteAction,
		onSwitchProcessorChange,
	]);

	const reorderProcessorRow = useCallback(
		(updatedRow: ProcessorData[]) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			if (expandedPipelineData) {
				const modifiedProcessorData = { ...expandedPipelineData };
				modifiedProcessorData.config = updatedRow;
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
			if (expandedPipelineData?.config && isActionMode === ActionMode.Editing) {
				const updatedRow = getUpdatedRow(
					expandedPipelineData?.config,
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
			expandedPipelineData?.config,
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

	const onRowHandler = (index?: number): React.HTMLAttributes<unknown> =>
		({
			index,
			moveRow: moveProcessorRow,
		} as React.HTMLAttributes<unknown>);

	return (
		<DndProvider backend={HTML5Backend} key={v4()}>
			<StyledTable
				isDarkMode={isDarkMode}
				showHeader={false}
				columns={columns}
				size="small"
				components={tableComponents}
				dataSource={processorData}
				pagination={false}
				onRow={(
					_record: ProcessorData,
					index?: number,
				): React.HTMLAttributes<unknown> => onRowHandler(index)}
				footer={footer}
			/>
		</DndProvider>
	);
}

interface PipelineExpandViewProps {
	handleAlert: (props: AlertMessage) => void;
	setActionType: (actionType?: ActionType) => void;
	processorEditAction: (record: ProcessorData) => () => void;
	isActionMode: string;
	setShowSaveButton: (actionMode: ActionMode) => void;
	expandedPipelineData: PipelineData | undefined;
	setExpandedPipelineData: (data: PipelineData) => void;
	processorData: Array<ProcessorData> | undefined;
}

export default PipelineExpandView;
