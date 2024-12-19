import { PlusCircleOutlined } from '@ant-design/icons';
import { TableLocale } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import {
	ActionMode,
	ActionType,
	PipelineData,
	ProcessorData,
} from 'types/api/pipeline/def';

import { tableComponents } from '../config';
import { ModalFooterTitle } from '../styles';
import { processorColumns } from './config';
import { AlertMessage } from './PipelineListsView';
import { FooterButton, StyledTable } from './styles';
import DragAction from './TableComponents/DragAction';
import ProcessorActions from './TableComponents/ProcessorActions';
import {
	getEditedDataSource,
	getProcessorUpdatedRow,
	getRecordIndex,
	getTableColumn,
} from './utils';

function PipelineExpandView({
	handleAlert,
	setActionType,
	processorEditAction,
	isActionMode,
	setShowSaveButton,
	expandedPipelineData,
	setExpandedPipelineData,
	prevPipelineData,
}: PipelineExpandViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	const isDarkMode = useIsDarkMode();
	const isEditingActionMode = isActionMode === ActionMode.Editing;

	const deleteProcessorHandler = useCallback(
		(record: ProcessorData) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			if (expandedPipelineData && expandedPipelineData?.config) {
				const filteredData = expandedPipelineData?.config.filter(
					(item: ProcessorData) => item.id !== record.id,
				);
				const pipelineData = { ...expandedPipelineData };
				pipelineData.config = filteredData;
				pipelineData.config.forEach((item, index) => {
					const obj = item;
					obj.orderId = index + 1;
				});
				for (let i = 0; i < pipelineData.config.length - 1; i += 1) {
					pipelineData.config[i].output = pipelineData.config[i + 1].id;
				}
				delete pipelineData.config[pipelineData.config.length - 1]?.output;
				setExpandedPipelineData(pipelineData);
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
					'id',
				);
				const updateSwitch = {
					...expandedPipelineData?.config[findRecordIndex],
					enabled: checked,
				};
				const editedData = getEditedDataSource(
					expandedPipelineData?.config,
					record,
					'id',
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
		if (isEditingActionMode) {
			fieldColumns.push(
				{
					title: '',
					dataIndex: 'action',
					key: 'action',
					render: (_value, record): JSX.Element => (
						<ProcessorActions
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
		isEditingActionMode,
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
			if (expandedPipelineData?.config && isEditingActionMode) {
				const updatedRow = getProcessorUpdatedRow(
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
			expandedPipelineData?.config,
			isEditingActionMode,
			handleAlert,
			t,
			reorderProcessorRow,
			onCancelReorderProcessorRow,
		],
	);

	const addNewProcessorHandler = useCallback((): void => {
		setActionType(ActionType.AddProcessor);

		logEvent('Logs: Pipelines: Clicked Add New Processor', {
			source: 'signoz-ui',
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [setActionType]);

	const footer = useCallback((): JSX.Element | undefined => {
		const prevPipelinesCount = prevPipelineData?.length || 0;
		if (prevPipelinesCount === 0 || isEditingActionMode) {
			return (
				<FooterButton type="link" onClick={addNewProcessorHandler}>
					<PlusCircleOutlined />
					<ModalFooterTitle>{t('add_new_processor')}</ModalFooterTitle>
				</FooterButton>
			);
		}
		return undefined;
	}, [isEditingActionMode, prevPipelineData, addNewProcessorHandler, t]);

	const onRowHandler = (
		_data: ProcessorData,
		index?: number,
	): React.HTMLAttributes<unknown> =>
		({
			index,
			moveRow: moveProcessorRow,
		} as React.HTMLAttributes<unknown>);

	const processorData = useMemo(
		() =>
			expandedPipelineData?.config &&
			expandedPipelineData?.config.map(
				(item: ProcessorData): ProcessorData => ({
					id: item.id,
					orderId: item.orderId,
					type: item.type,
					name: item.name,
					enabled: item.enabled,
				}),
			),
		[expandedPipelineData],
	);

	const getLocales = (): TableLocale => ({
		emptyText: <span />,
	});

	return (
		<DndProvider backend={HTML5Backend}>
			<StyledTable
				locale={getLocales()}
				isDarkMode={isDarkMode}
				showHeader={false}
				columns={columns}
				rowKey="id"
				size="small"
				components={tableComponents}
				dataSource={processorData}
				pagination={false}
				onRow={onRowHandler}
				footer={footer}
			/>
		</DndProvider>
	);
}

PipelineExpandView.defaultProps = {
	expandedPipelineData: {},
};

interface PipelineExpandViewProps {
	handleAlert: (props: AlertMessage) => void;
	setActionType: (actionType?: ActionType) => void;
	processorEditAction: (record: ProcessorData) => () => void;
	isActionMode: string;
	setShowSaveButton: (actionMode: ActionMode) => void;
	expandedPipelineData?: PipelineData;
	setExpandedPipelineData: (data: PipelineData) => void;
	prevPipelineData: Array<PipelineData>;
}

export default PipelineExpandView;
