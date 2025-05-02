import './styles.scss';

import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Card, Modal, Table, Typography } from 'antd';
import { ExpandableConfig } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import savePipeline from 'api/pipeline/post';
import { useNotifications } from 'hooks/useNotifications';
import { isUndefined } from 'lodash-es';
import cloneDeep from 'lodash-es/cloneDeep';
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import {
	ActionMode,
	ActionType,
	Pipeline,
	PipelineData,
	ProcessorData,
} from 'types/api/pipeline/def';
import { v4 } from 'uuid';

import { tableComponents } from '../config';
import PipelinesSearchSection from '../Layouts/Pipeline/PipelinesSearchSection';
import AddNewPipeline from './AddNewPipeline';
import AddNewProcessor from './AddNewProcessor';
import { pipelineColumns } from './config';
import ModeAndConfiguration from './ModeAndConfiguration';
import PipelineExpanView from './PipelineExpandView';
import SaveConfigButton from './SaveConfigButton';
import {
	AlertContentWrapper,
	AlertModalTitle,
	Container,
	FooterButton,
} from './styles';
import DragAction from './TableComponents/DragAction';
import PipelineActions from './TableComponents/PipelineActions';
import PreviewAction from './TableComponents/PipelineActions/components/PreviewAction';
import TableExpandIcon from './TableComponents/TableExpandIcon';
import {
	getDataOnSearch,
	getEditedDataSource,
	getElementFromArray,
	getRecordIndex,
	getTableColumn,
	getUpdatedRow,
} from './utils';

function PipelinesListEmptyState(): JSX.Element {
	const { t } = useTranslation(['pipeline']);
	return (
		<div className="logs-pipelines-empty-state-centered-container">
			<Card size="small">
				<div className="logs-pipelines-empty-state-centered-container">
					<iframe
						className="logs-pipelines-empty-state-video-iframe"
						sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
						src="https://www.youtube.com/embed/OneENGNmLd0"
						frameBorder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						title={t('learn_more')}
					/>
					<div>
						<Typography>
							{t('learn_more')}&nbsp;
							<a
								href="https://signoz.io/docs/logs-pipelines/introduction/?utm_source=product&utm_medium=pipelines-tab"
								target="_blank"
								rel="noreferrer"
							>
								here
							</a>
						</Typography>
					</div>
				</div>
			</Card>
		</div>
	);
}

function PipelineListsView({
	isActionType,
	setActionType,
	isActionMode,
	setActionMode,
	pipelineData,
	refetchPipelineLists,
}: PipelineListsViewProps): JSX.Element {
	const { t } = useTranslation(['pipeline', 'common']);
	const [modal, contextHolder] = Modal.useModal();
	const { notifications } = useNotifications();
	const [pipelineSearchValue, setPipelineSearchValue] = useState<string>('');
	const [prevPipelineData, setPrevPipelineData] = useState<Array<PipelineData>>(
		cloneDeep(pipelineData?.pipelines || []),
	);
	const [currPipelineData, setCurrPipelineData] = useState<Array<PipelineData>>(
		cloneDeep(pipelineData?.pipelines || []),
	);

	const [expandedPipelineId, setExpandedPipelineId] = useState<
		string | undefined
	>(undefined);
	const expandedPipelineData = useCallback(
		() => currPipelineData?.find((p) => p.id === expandedPipelineId),
		[currPipelineData, expandedPipelineId],
	);
	const setExpandedPipelineData = useCallback(
		(newData: PipelineData): void => {
			if (expandedPipelineId) {
				const pipelineIdx = currPipelineData?.findIndex(
					(p) => p.id === expandedPipelineId,
				);
				if (pipelineIdx >= 0) {
					const newPipelineData = [...currPipelineData];
					newPipelineData[pipelineIdx] = newData;
					setCurrPipelineData(newPipelineData);
				}
			}
		},
		[expandedPipelineId, currPipelineData],
	);

	const [
		selectedProcessorData,
		setSelectedProcessorData,
	] = useState<ProcessorData>();

	const [
		selectedPipelineData,
		setSelectedPipelineData,
	] = useState<PipelineData>();

	const [expandedRowKeys, setExpandedRowKeys] = useState<Array<string>>();
	const [showSaveButton, setShowSaveButton] = useState<string>();
	const isEditingActionMode = isActionMode === ActionMode.Editing;

	const visibleCurrPipelines = useMemo((): Array<PipelineData> => {
		if (pipelineSearchValue === '') {
			return currPipelineData;
		}
		return currPipelineData.filter((data) =>
			getDataOnSearch(data as never, pipelineSearchValue),
		);
	}, [currPipelineData, pipelineSearchValue]);

	const handleAlert = useCallback(
		({
			title,
			descrition,
			buttontext,
			onCancel,
			onOk,
			className,
		}: AlertMessage) => {
			modal.confirm({
				title: <AlertModalTitle>{title}</AlertModalTitle>,
				icon: <ExclamationCircleOutlined />,
				content: <AlertContentWrapper>{descrition}</AlertContentWrapper>,
				okText: <span className={`${className}-ok-text`}>{buttontext}</span>,
				cancelText: <span>{t('cancel')}</span>,
				onOk,
				className,
				onCancel,
			});
		},
		[modal, t],
	);

	const pipelineEditAction = useCallback(
		(record: PipelineData) => (): void => {
			setActionType(ActionType.EditPipeline);
			setSelectedPipelineData(record);
		},
		[setActionType],
	);

	const pipelineDeleteHandler = useCallback(
		(record: PipelineData) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			const filteredData = getElementFromArray(currPipelineData, record, 'id');
			filteredData.forEach((item, index) => {
				const obj = item;
				obj.orderId = index + 1;
			});
			setCurrPipelineData(filteredData);
		},
		[currPipelineData],
	);

	const pipelineDeleteAction = useCallback(
		(record: PipelineData) => (): void => {
			handleAlert({
				title: `${t('delete_pipeline')} : ${record.name}?`,
				descrition: t('delete_pipeline_description'),
				buttontext: t('delete'),
				onOk: pipelineDeleteHandler(record),
				className: 'delete-pipeline',
			});
		},
		[handleAlert, pipelineDeleteHandler, t],
	);

	const processorEditAction = useCallback(
		(record: ProcessorData) => (): void => {
			setActionType(ActionType.EditProcessor);
			setSelectedProcessorData(record);
		},
		[setActionType],
	);

	const onSwitchPipelineChange = useCallback(
		(checked: boolean, record: PipelineData): void => {
			setShowSaveButton(ActionMode.Editing);
			const findRecordIndex = getRecordIndex(currPipelineData, record, 'id');
			const updateSwitch = {
				...currPipelineData[findRecordIndex],
				enabled: checked,
			};
			const editedPipelineData = getEditedDataSource(
				currPipelineData,
				record,
				'id',
				updateSwitch,
			);
			setCurrPipelineData(editedPipelineData);
		},
		[currPipelineData],
	);

	const columns = useMemo(() => {
		const fieldColumns = getTableColumn(pipelineColumns);
		if (isEditingActionMode) {
			fieldColumns.push(
				{
					title: 'Actions',
					dataIndex: 'smartAction',
					key: 'smartAction',
					align: 'center',
					render: (_value, record): JSX.Element => (
						<PipelineActions
							pipeline={record}
							editAction={pipelineEditAction(record)}
							deleteAction={pipelineDeleteAction(record)}
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
								onSwitchPipelineChange(checked, record)
							}
						/>
					),
				},
			);
		} else {
			fieldColumns.push({
				title: 'Actions',
				dataIndex: 'smartAction',
				key: 'smartAction',
				align: 'center',
				render: (_value, record): JSX.Element => (
					<PreviewAction pipeline={record} />
				),
			});
		}
		return fieldColumns;
	}, [
		isEditingActionMode,
		pipelineEditAction,
		pipelineDeleteAction,
		onSwitchPipelineChange,
	]);

	const updatePipelineSequence = useCallback(
		(updatedRow: PipelineData[]) => (): void => {
			setShowSaveButton(ActionMode.Editing);
			setCurrPipelineData(updatedRow);
		},
		[],
	);

	const onCancelPipelineSequence = useCallback(
		(rawData: PipelineData[]) => (): void => {
			setCurrPipelineData(rawData);
		},
		[],
	);

	const movePipelineRow = useCallback(
		(dragIndex: number, hoverIndex: number) => {
			if (currPipelineData && isEditingActionMode) {
				const rawData = currPipelineData;

				const updatedRows = getUpdatedRow(
					currPipelineData,
					visibleCurrPipelines[dragIndex].orderId - 1,
					visibleCurrPipelines[hoverIndex].orderId - 1,
				);

				updatedRows.forEach((item, index) => {
					const obj = item;
					obj.orderId = index + 1;
				});
				handleAlert({
					title: t('reorder_pipeline'),
					descrition: t('reorder_pipeline_description'),
					buttontext: t('reorder'),
					onOk: updatePipelineSequence(updatedRows),
					onCancel: onCancelPipelineSequence(rawData),
				});
			}
		},
		[
			currPipelineData,
			isEditingActionMode,
			visibleCurrPipelines,
			handleAlert,
			t,
			updatePipelineSequence,
			onCancelPipelineSequence,
		],
	);

	const expandedRowView = useCallback(
		(): JSX.Element => (
			<PipelineExpanView
				handleAlert={handleAlert}
				isActionMode={isActionMode}
				setActionType={setActionType}
				processorEditAction={processorEditAction}
				setShowSaveButton={setShowSaveButton}
				expandedPipelineData={expandedPipelineData()}
				setExpandedPipelineData={setExpandedPipelineData}
				prevPipelineData={prevPipelineData}
			/>
		),
		[
			handleAlert,
			processorEditAction,
			isActionMode,
			expandedPipelineData,
			setActionType,
			prevPipelineData,
			setExpandedPipelineData,
		],
	);

	const onExpand = useCallback(
		(expanded: boolean, record: PipelineData): void => {
			const keys = [];
			if (expanded && record.id) {
				keys.push(record?.id);
			}
			setExpandedRowKeys(keys);
			setExpandedPipelineId(record.id);
		},
		[],
	);

	const getExpandIcon = (
		expanded: boolean,
		onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void,
		record: PipelineData,
	): JSX.Element => (
		<TableExpandIcon expanded={expanded} onExpand={onExpand} record={record} />
	);

	const addNewPipelineHandler = useCallback((): void => {
		setActionType(ActionType.AddPipeline);

		logEvent('Logs: Pipelines: Clicked Add New Pipeline', {
			source: 'signoz-ui',
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [setActionType]);

	const footer = useCallback((): JSX.Element | undefined => {
		if (isEditingActionMode) {
			return (
				<FooterButton
					type="link"
					onClick={addNewPipelineHandler}
					icon={<PlusOutlined />}
				>
					{t('add_new_pipeline')}
				</FooterButton>
			);
		}
		return undefined;
	}, [isEditingActionMode, addNewPipelineHandler, t]);

	const onSaveConfigurationHandler = useCallback(async () => {
		const modifiedPipelineData = currPipelineData.map((item: PipelineData) => {
			const pipelineData = { ...item };
			delete pipelineData?.id;
			return pipelineData;
		});
		const response = await savePipeline({
			data: { pipelines: modifiedPipelineData },
		});
		if (response.statusCode === 200) {
			refetchPipelineLists();
			setActionMode(ActionMode.Viewing);
			setShowSaveButton(undefined);

			const pipelinesInDB = response.payload?.pipelines || [];
			setCurrPipelineData(pipelinesInDB);
			setPrevPipelineData(pipelinesInDB);

			logEvent('Logs: Pipelines: Saved Pipelines', {
				count: pipelinesInDB.length,
				enabled: pipelinesInDB.filter((p) => p.enabled).length,
				source: 'signoz-ui',
			});
		} else {
			modifiedPipelineData.forEach((item: PipelineData) => {
				const pipelineData = item;
				pipelineData.id = v4();
				return pipelineData;
			});
			setActionMode(ActionMode.Editing);
			setShowSaveButton(ActionMode.Editing);
			notifications.error({
				message: 'Error',
				description: response.error || t('something_went_wrong'),
			});
			setCurrPipelineData(modifiedPipelineData);
			setPrevPipelineData(modifiedPipelineData);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currPipelineData, notifications, refetchPipelineLists, setActionMode, t]);

	const onCancelConfigurationHandler = useCallback((): void => {
		setActionMode(ActionMode.Viewing);
		setShowSaveButton(undefined);
		prevPipelineData.forEach((item, index) => {
			const obj = item;
			obj.orderId = index + 1;
			if (obj.config) {
				obj.config?.forEach((configItem, index) => {
					const config = configItem;
					config.orderId = index + 1;
				});
				for (let i = 0; i < obj.config.length - 1; i += 1) {
					obj.config[i].output = obj.config[i + 1].id;
				}
			}
		});
		setCurrPipelineData(prevPipelineData);
		setExpandedRowKeys([]);
	}, [prevPipelineData, setActionMode]);

	const onRowHandler = (
		_data: PipelineData,
		index?: number,
	): React.HTMLAttributes<unknown> =>
		({
			index,
			moveRow: movePipelineRow,
		} as React.HTMLAttributes<unknown>);

	const expandableConfig: ExpandableConfig<PipelineData> = {
		expandedRowKeys,
		onExpand,
		expandIcon: ({ expanded, onExpand, record }: ExpandRowConfig) =>
			getExpandIcon(expanded, onExpand, record),
	};

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(currPipelineData)) {
			logEvent('Logs Pipelines: List page visited', {
				number: currPipelineData?.length,
			});
			logEventCalledRef.current = true;
		}
	}, [currPipelineData]);

	return (
		<>
			{contextHolder}
			<AddNewPipeline
				isActionType={isActionType}
				setActionType={setActionType}
				selectedPipelineData={selectedPipelineData}
				setShowSaveButton={setShowSaveButton}
				setCurrPipelineData={setCurrPipelineData}
				currPipelineData={currPipelineData}
			/>
			<AddNewProcessor
				isActionType={isActionType}
				setActionType={setActionType}
				selectedProcessorData={selectedProcessorData}
				setShowSaveButton={setShowSaveButton}
				expandedPipelineData={expandedPipelineData()}
				setExpandedPipelineData={setExpandedPipelineData}
			/>
			{prevPipelineData?.length > 0 || currPipelineData?.length > 0 ? (
				<>
					<PipelinesSearchSection setPipelineSearchValue={setPipelineSearchValue} />
					<Container>
						<ModeAndConfiguration
							isActionMode={isActionMode}
							version={pipelineData?.version}
						/>
						<DndProvider backend={HTML5Backend}>
							<Table
								rowKey="id"
								columns={columns}
								expandedRowRender={expandedRowView}
								expandable={expandableConfig}
								components={tableComponents}
								dataSource={visibleCurrPipelines}
								onRow={onRowHandler}
								footer={footer}
								pagination={false}
							/>
						</DndProvider>
						{isEditingActionMode && (
							<SaveConfigButton
								showSaveButton={Boolean(showSaveButton)}
								onSaveConfigurationHandler={onSaveConfigurationHandler}
								onCancelConfigurationHandler={onCancelConfigurationHandler}
							/>
						)}
					</Container>
				</>
			) : (
				<Container>
					<PipelinesListEmptyState />
				</Container>
			)}
		</>
	);
}

interface PipelineListsViewProps {
	isActionType: string;
	setActionType: (actionType?: ActionType) => void;
	isActionMode: string;
	setActionMode: (actionMode: ActionMode) => void;
	pipelineData: Pipeline;
	refetchPipelineLists: VoidFunction;
}

interface ExpandRowConfig {
	expanded: boolean;
	onExpand: (record: PipelineData, e: React.MouseEvent<HTMLElement>) => void;
	record: PipelineData;
}

export interface AlertMessage {
	title: string;
	descrition: string;
	buttontext: string;
	onOk: VoidFunction;
	onCancel?: VoidFunction;
	className?: string;
}

export default PipelineListsView;
