/* eslint-disable react/jsx-props-no-spreading */
import './ExplorerOptions.styles.scss';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import {
	Button,
	ColorPicker,
	Divider,
	Input,
	Modal,
	RefSelectProps,
	Select,
	Tooltip,
	Typography,
} from 'antd';
import logEvent from 'api/common/logEvent';
import { TelemetryFieldKey } from 'api/v5/v5';
import axios from 'axios';
import cx from 'classnames';
import { getViewDetailsUsingViewKey } from 'components/ExplorerCard/utils';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import ExportPanelContainer from 'container/ExportPanel/ExportPanelContainer';
import {
	MetricsExplorerEventKeys,
	MetricsExplorerEvents,
} from 'container/MetricsExplorer/events';
import { useOptionsMenu } from 'container/OptionsMenu';
import {
	defaultLogsSelectedColumns,
	defaultTraceSelectedColumns,
} from 'container/OptionsMenu/constants';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { useGetSearchQueryParam } from 'hooks/queryBuilder/useGetSearchQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useGetAllViews } from 'hooks/saveViews/useGetAllViews';
import { useSaveView } from 'hooks/saveViews/useSaveView';
import { useUpdateView } from 'hooks/saveViews/useUpdateView';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useErrorNotification from 'hooks/useErrorNotification';
import { useHandleExplorerTabChange } from 'hooks/useHandleExplorerTabChange';
import { useNotifications } from 'hooks/useNotifications';
import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import { cloneDeep, isEqual, omit } from 'lodash-es';
import {
	Check,
	ConciergeBell,
	Disc3,
	PanelBottomClose,
	Plus,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { FormattingOptions } from 'providers/preferences/types';
import {
	CSSProperties,
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useHistory } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { ViewProps } from 'types/api/saveViews/types';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { USER_ROLES } from 'types/roles';
import { panelTypeToExplorerView } from 'utils/explorerUtils';

import { PreservedViewsTypes } from './constants';
import ExplorerOptionsHideArea from './ExplorerOptionsHideArea';
import { ChangeViewFunctionType, PreservedViewsInLocalStorage } from './types';
import {
	DATASOURCE_VS_ROUTES,
	generateRGBAFromHex,
	getRandomColor,
	saveNewViewHandler,
	setExplorerToolBarVisibility,
} from './utils';

const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.AUTHOR, USER_ROLES.EDITOR];

// eslint-disable-next-line sonarjs/cognitive-complexity
function ExplorerOptions({
	disabled,
	isLoading,
	onExport,
	query,
	sourcepage,
	signalSource,
	isExplorerOptionHidden = false,
	setIsExplorerOptionHidden,
	isOneChartPerQuery = false,
	splitedQueries = [],
	handleChangeSelectedView,
}: ExplorerOptionsProps): JSX.Element {
	const [isExport, setIsExport] = useState<boolean>(false);
	const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
	const [newViewName, setNewViewName] = useState<string>('');
	const [color, setColor] = useState(Color.BG_SIENNA_500);
	const { notifications } = useNotifications();
	const history = useHistory();
	const ref = useRef<RefSelectProps>(null);
	const isDarkMode = useIsDarkMode();
	const [queryToExport, setQueryToExport] = useState<Query | null>(null);

	const isLogsExplorer = sourcepage === DataSource.LOGS;
	const isMetricsExplorer = sourcepage === DataSource.METRICS;
	const isMeterExplorer = signalSource === 'meter';

	const PRESERVED_VIEW_LOCAL_STORAGE_KEY = LOCALSTORAGE.LAST_USED_SAVED_VIEWS;

	const PRESERVED_VIEW_TYPE = useMemo(() => {
		if (isLogsExplorer) {
			return PreservedViewsTypes.LOGS;
		}
		if (isMetricsExplorer) {
			return PreservedViewsTypes.METRICS;
		}
		if (isMeterExplorer) {
			return PreservedViewsTypes.METER;
		}
		return PreservedViewsTypes.TRACES;
	}, [isLogsExplorer, isMetricsExplorer, isMeterExplorer]);

	const onModalToggle = useCallback((value: boolean) => {
		setIsExport(value);
	}, []);

	const {
		currentQuery,
		panelType,
		isStagedQueryUpdated,
		redirectWithQueryBuilderData,
		isDefaultQuery,
	} = useQueryBuilder();

	const handleSaveViewModalToggle = (): void => {
		if (sourcepage === DataSource.TRACES) {
			logEvent('Traces Explorer: Save view clicked', {
				panelType,
			});
		} else if (isLogsExplorer) {
			logEvent('Logs Explorer: Save view clicked', {
				panelType,
			});
		} else if (isMetricsExplorer) {
			logEvent(MetricsExplorerEvents.SaveViewClicked, {
				[MetricsExplorerEventKeys.Tab]: 'explorer',
				[MetricsExplorerEventKeys.OneChartPerQueryEnabled]: isOneChartPerQuery,
				panelType,
			});
		} else if (isMeterExplorer) {
			logEvent('Meter Explorer: Save view clicked', {
				panelType,
			});
		}
		setIsSaveModalOpen(!isSaveModalOpen);
	};

	const hideSaveViewModal = (): void => {
		setIsSaveModalOpen(false);
	};

	const { user } = useAppContext();

	const handleConditionalQueryModification = useCallback(
		(defaultQuery: Query | null): string => {
			const queryToUse = defaultQuery || query;
			if (
				queryToUse?.builder?.queryData?.[0]?.aggregateOperator !==
				StringOperators.NOOP
			) {
				return JSON.stringify(queryToUse);
			}

			// Modify aggregateOperator to count, as noop is not supported in alerts
			const modifiedQuery = cloneDeep(queryToUse);

			modifiedQuery.builder.queryData[0].aggregateOperator = StringOperators.COUNT;

			return JSON.stringify(modifiedQuery);
		},
		[query],
	);

	const onCreateAlertsHandler = useCallback(
		(defaultQuery: Query | null) => {
			if (sourcepage === DataSource.TRACES) {
				logEvent('Traces Explorer: Create alert', {
					panelType,
				});
			} else if (isLogsExplorer) {
				logEvent('Logs Explorer: Create alert', {
					panelType,
				});
			} else if (isMetricsExplorer) {
				logEvent(MetricsExplorerEvents.AddToAlertClicked, {
					panelType,
					[MetricsExplorerEventKeys.Tab]: 'explorer',
					[MetricsExplorerEventKeys.OneChartPerQueryEnabled]: isOneChartPerQuery,
				});
			}

			const stringifiedQuery = handleConditionalQueryModification(defaultQuery);

			history.push(
				`${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
					stringifiedQuery,
				)}`,
			);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[handleConditionalQueryModification, history],
	);

	const onCancel = (value: boolean) => (): void => {
		onModalToggle(value);
		if (isOneChartPerQuery) {
			setQueryToExport(null);
		}
	};

	const onAddToDashboard = useCallback((): void => {
		if (sourcepage === DataSource.TRACES) {
			logEvent('Traces Explorer: Add to dashboard clicked', {
				panelType,
			});
		} else if (isLogsExplorer) {
			logEvent('Logs Explorer: Add to dashboard clicked', {
				panelType,
			});
		} else if (isMetricsExplorer) {
			logEvent(MetricsExplorerEvents.AddToDashboardClicked, {
				panelType,
				[MetricsExplorerEventKeys.Tab]: 'explorer',
				[MetricsExplorerEventKeys.OneChartPerQueryEnabled]: isOneChartPerQuery,
			});
		}
		setIsExport(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLogsExplorer, isMetricsExplorer, panelType, setIsExport, sourcepage]);

	const {
		data: viewsData,
		isLoading: viewsIsLoading,
		error,
		isRefetching,
		refetch: refetchAllView,
	} = useGetAllViews(isMeterExplorer ? 'meter' : sourcepage);

	const compositeQuery = mapCompositeQueryFromQuery(currentQuery, panelType);

	const viewName = useGetSearchQueryParam(QueryParams.viewName) || '';
	const viewKey = useGetSearchQueryParam(QueryParams.viewKey) || '';

	const extraData = viewsData?.data?.data?.find((view) => view.id === viewKey)
		?.extraData;

	const extraDataColor = extraData ? JSON.parse(extraData).color : '';
	const rgbaColor = generateRGBAFromHex(
		extraDataColor || Color.BG_SIENNA_500,
		0.08,
	);

	const { options, handleOptionsChange } = useOptionsMenu({
		storageKey:
			sourcepage === DataSource.TRACES
				? LOCALSTORAGE.TRACES_LIST_OPTIONS
				: LOCALSTORAGE.LOGS_LIST_OPTIONS,
		dataSource: sourcepage,
		aggregateOperator: StringOperators.NOOP,
	});

	const getUpdatedExtraData = (
		extraData: string | undefined,
		newSelectedColumns: TelemetryFieldKey[],
		formattingOptions?: FormattingOptions,
	): string => {
		let updatedExtraData;

		if (extraData) {
			const parsedExtraData = JSON.parse(extraData);
			parsedExtraData.selectColumns = newSelectedColumns;
			if (formattingOptions) {
				parsedExtraData.format = formattingOptions.format;
				parsedExtraData.maxLines = formattingOptions.maxLines;
				parsedExtraData.fontSize = formattingOptions.fontSize;
			}
			updatedExtraData = JSON.stringify(parsedExtraData);
		} else {
			updatedExtraData = JSON.stringify({
				color: Color.BG_SIENNA_500,
				selectColumns: newSelectedColumns,
				format: formattingOptions?.format,
				maxLines: formattingOptions?.maxLines,
				fontSize: formattingOptions?.fontSize,
			});
		}
		return updatedExtraData;
	};

	const updatedExtraData = getUpdatedExtraData(
		extraData,
		options?.selectColumns,
		// pass this only for logs
		sourcepage === DataSource.LOGS
			? {
					format: options?.format,
					maxLines: options?.maxLines,
					fontSize: options?.fontSize,
			  }
			: undefined,
	);

	const {
		mutateAsync: updateViewAsync,
		isLoading: isViewUpdating,
	} = useUpdateView({
		compositeQuery,
		viewKey,
		extraData: updatedExtraData,
		sourcePage: isMeterExplorer ? 'meter' : sourcepage,
		viewName,
	});

	const showErrorNotification = (err: Error): void => {
		notifications.error({
			message: axios.isAxiosError(err) ? err.message : SOMETHING_WENT_WRONG,
		});
	};

	const onUpdateQueryHandler = (): void => {
		updateViewAsync(
			{
				compositeQuery: mapCompositeQueryFromQuery(currentQuery, panelType),
				viewKey,
				extraData: updatedExtraData,
				sourcePage: isMeterExplorer ? 'meter' : sourcepage,
				viewName,
			},
			{
				onSuccess: () => {
					notifications.success({
						message: 'View Updated Successfully',
					});
					refetchAllView();
				},
				onError: (err) => {
					showErrorNotification(err);
				},
			},
		);
	};

	useErrorNotification(error);

	const { handleExplorerTabChange } = useHandleExplorerTabChange();

	type ExtraData = {
		selectColumns?: TelemetryFieldKey[];
		version?: number;
	};

	const updateOrRestoreSelectColumns = (
		key: string,
		allViewsData: ViewProps[] | undefined,
		options: OptionsQuery,
		handleOptionsChange: (newQueryData: OptionsQuery) => void,
	): void => {
		const currentViewDetails = getViewDetailsUsingViewKey(key, allViewsData);
		if (!currentViewDetails) {
			return;
		}

		let extraData: ExtraData = {};
		try {
			extraData = JSON.parse(currentViewDetails?.extraData ?? '{}') as ExtraData;
		} catch (error) {
			console.error('Error parsing extraData:', error);
		}

		let backwardCompatibleOptions = options;

		if (!extraData?.version) {
			backwardCompatibleOptions = omit(options, 'version');
		}

		if (extraData.selectColumns?.length) {
			handleOptionsChange({
				...backwardCompatibleOptions,
				selectColumns: extraData.selectColumns,
			});
		} else if (!isEqual(defaultTraceSelectedColumns, options.selectColumns)) {
			handleOptionsChange({
				...backwardCompatibleOptions,
				selectColumns: defaultTraceSelectedColumns,
			});
		}
	};
	const onMenuItemSelectHandler = useCallback(
		({ key }: { key: string }): void => {
			const currentViewDetails = getViewDetailsUsingViewKey(
				key,
				viewsData?.data?.data,
			);
			if (!currentViewDetails) return;
			const { query, name, id, panelType: currentPanelType } = currentViewDetails;

			if (handleChangeSelectedView) {
				handleChangeSelectedView(panelTypeToExplorerView[currentPanelType], {
					query,
					name,
					id,
				});
			} else {
				// to remove this after traces cleanup
				handleExplorerTabChange(currentPanelType, {
					query,
					name,
					id,
				});
			}
		},
		[viewsData, handleExplorerTabChange, handleChangeSelectedView],
	);

	const updatePreservedViewInLocalStorage = (option: {
		key: string;
		value: string;
	}): void => {
		// Retrieve stored views from local storage
		const storedViews = localStorage.getItem(PRESERVED_VIEW_LOCAL_STORAGE_KEY);

		// Initialize or parse the stored views
		const updatedViews: PreservedViewsInLocalStorage = storedViews
			? JSON.parse(storedViews)
			: {};

		// Update the views with the new selection
		updatedViews[PRESERVED_VIEW_TYPE] = {
			key: option.key,
			value: option.value,
		};

		// Save the updated views back to local storage
		localStorage.setItem(
			PRESERVED_VIEW_LOCAL_STORAGE_KEY,
			JSON.stringify(updatedViews),
		);
	};

	const handleSelect = (
		value: string,
		option: { key: string; value: string },
	): void => {
		onMenuItemSelectHandler({
			key: option.key,
		});
		if (sourcepage === DataSource.TRACES) {
			logEvent('Traces Explorer: Select view', {
				panelType,
				viewName: option?.value,
			});
		} else if (isLogsExplorer) {
			logEvent('Logs Explorer: Select view', {
				panelType,
				viewName: option?.value,
			});
		} else if (isMetricsExplorer) {
			logEvent('Metrics Explorer: Select view', {
				panelType,
				viewName: option?.value,
			});
		} else if (isMeterExplorer) {
			logEvent('Meter Explorer: Select view', {
				panelType,
				viewName: option?.value,
			});
		}

		updatePreservedViewInLocalStorage(option);

		updateOrRestoreSelectColumns(
			option.key,
			viewsData?.data?.data,
			options,
			handleOptionsChange,
		);

		if (ref.current) {
			ref.current.blur();
		}
	};

	const removeCurrentViewFromLocalStorage = (): void => {
		// Retrieve stored views from local storage
		const storedViews = localStorage.getItem(PRESERVED_VIEW_LOCAL_STORAGE_KEY);

		if (storedViews) {
			// Parse the stored views
			const parsedViews = JSON.parse(storedViews);

			// Remove the current view type from the parsed views
			delete parsedViews[PRESERVED_VIEW_TYPE];

			// Update local storage with the modified views
			localStorage.setItem(
				PRESERVED_VIEW_LOCAL_STORAGE_KEY,
				JSON.stringify(parsedViews),
			);
		}
	};

	const handleClearSelect = (): void => {
		removeCurrentViewFromLocalStorage();

		handleOptionsChange({
			...options,
			selectColumns:
				sourcepage === DataSource.TRACES
					? defaultTraceSelectedColumns
					: defaultLogsSelectedColumns,
		});

		if (signalSource === 'meter') {
			history.replace(ROUTES.METER_EXPLORER);
			return;
		}

		if (handleChangeSelectedView) {
			handleChangeSelectedView(panelTypeToExplorerView[PANEL_TYPES.LIST]);
		}

		history.replace(DATASOURCE_VS_ROUTES[sourcepage]);
	};

	const isQueryUpdated = isStagedQueryUpdated(
		viewsData?.data?.data,
		viewKey,
		options,
	);

	const {
		isLoading: isSaveViewLoading,
		mutateAsync: saveViewAsync,
	} = useSaveView({
		viewName: newViewName || '',
		compositeQuery,
		sourcePage: sourcepage,
		extraData: JSON.stringify({
			color,
			selectColumns: options.selectColumns,
		}),
	});

	const onSaveHandler = (): void => {
		saveNewViewHandler({
			compositeQuery,
			handlePopOverClose: hideSaveViewModal,
			extraData: JSON.stringify({
				color,
				selectColumns: options.selectColumns,
				version: 1,
				...// pass this only for logs
				(sourcepage === DataSource.LOGS
					? {
							format: options?.format,
							maxLines: options?.maxLines,
							fontSize: options?.fontSize,
					  }
					: {}),
			}),
			notifications,
			panelType: panelType || PANEL_TYPES.LIST,
			redirectWithQueryBuilderData,
			refetchAllView,
			saveViewAsync,
			sourcePage: isMeterExplorer ? 'meter' : sourcepage,
			viewName: newViewName,
			setNewViewName,
		});
		if (sourcepage === DataSource.TRACES) {
			logEvent('Traces Explorer: Save view successful', {
				panelType,
				viewName: newViewName,
			});
		} else if (isLogsExplorer) {
			logEvent('Logs Explorer: Save view successful', {
				panelType,
				viewName: newViewName,
			});
		} else if (isMetricsExplorer) {
			logEvent('Metrics Explorer: Save view successful', {
				panelType,
				viewName: newViewName,
			});
		}
	};

	// TODO: Remove this and move this to scss file
	const dropdownStyle: CSSProperties = useMemo(
		() => ({
			borderRadius: '4px',
			border: isDarkMode
				? `1px solid ${Color.BG_SLATE_400}`
				: `1px solid ${Color.BG_VANILLA_300}`,
			background: isDarkMode
				? 'linear-gradient(139deg, rgba(18, 19, 23, 0.80) 0%, rgba(18, 19, 23, 0.90) 98.68%)'
				: 'linear-gradient(139deg, rgba(241, 241, 241, 0.8) 0%, rgba(241, 241, 241, 0.9) 98.68%)',
			boxShadow: '4px 10px 16px 2px rgba(0, 0, 0, 0.20)',
			backdropFilter: 'blur(20px)',
			bottom: '74px',
			width: '191px',
		}),
		[isDarkMode],
	);

	const isEditDeleteSupported = allowedRoles.includes(user.role as string);

	const [
		isRecentlyUsedSavedViewSelected,
		setIsRecentlyUsedSavedViewSelected,
	] = useState(false);

	useEffect(() => {
		// If the query is not the default query, don't set the recently used saved view
		if (!isDefaultQuery({ currentQuery, sourcePage: sourcepage })) {
			return;
		}

		const parsedPreservedView = JSON.parse(
			localStorage.getItem(PRESERVED_VIEW_LOCAL_STORAGE_KEY) || '{}',
		);

		const preservedView = parsedPreservedView[PRESERVED_VIEW_TYPE] || {};

		let timeoutId: string | number | NodeJS.Timeout | undefined;

		if (
			!!preservedView?.key &&
			viewsData?.data?.data &&
			!(!!viewName || !!viewKey) &&
			!isRecentlyUsedSavedViewSelected
		) {
			// prevent the race condition with useShareBuilderUrl
			timeoutId = setTimeout(() => {
				onMenuItemSelectHandler({ key: preservedView.key });
			}, 0);
			setIsRecentlyUsedSavedViewSelected(false);
		}

		// eslint-disable-next-line consistent-return
		return (): void => {
			clearTimeout(timeoutId);
		};
	}, [
		PRESERVED_VIEW_LOCAL_STORAGE_KEY,
		PRESERVED_VIEW_TYPE,
		currentQuery,
		isDefaultQuery,
		isRecentlyUsedSavedViewSelected,
		onMenuItemSelectHandler,
		sourcepage,
		viewKey,
		viewName,
		viewsData?.data?.data,
	]);

	const infoIconText = useMemo(() => {
		if (isLogsExplorer) {
			return 'Learn more about Logs explorer';
		}
		if (isMetricsExplorer) {
			return 'Learn more about Metrics explorer';
		}
		return 'Learn more about Traces explorer';
	}, [isLogsExplorer, isMetricsExplorer]);

	const infoIconLink = useMemo(() => {
		if (isLogsExplorer) {
			return 'https://signoz.io/docs/product-features/logs-explorer/?utm_source=product&utm_medium=logs-explorer-toolbar';
		}
		// TODO: Add metrics explorer info icon link
		if (isMetricsExplorer) {
			return '';
		}
		return 'https://signoz.io/docs/product-features/trace-explorer/?utm_source=product&utm_medium=trace-explorer-toolbar';
	}, [isLogsExplorer, isMetricsExplorer]);

	const getQueryName = (query: Query): string => {
		if (query.builder.queryFormulas.length > 0) {
			return `Formula ${query.builder.queryFormulas[0].queryName}`;
		}
		return `Query ${query.builder.queryData[0].queryName}`;
	};

	const CreateAlertButton = useMemo(() => {
		if (isOneChartPerQuery) {
			const selectLabel = (
				<Button
					disabled={disabled}
					shape="round"
					icon={<ConciergeBell size={16} />}
				>
					Create an Alert
				</Button>
			);
			return (
				<Select
					disabled={disabled}
					className="multi-alert-button"
					placeholder={selectLabel}
					value={selectLabel}
					suffixIcon={null}
					onSelect={(e): void => {
						const selectedQuery = splitedQueries.find(
							(query) => query.id === ((e as unknown) as string),
						);
						if (selectedQuery) {
							onCreateAlertsHandler(selectedQuery);
						}
					}}
				>
					{splitedQueries.map((splittedQuery) => (
						<Select.Option key={splittedQuery.id} value={splittedQuery.id}>
							{getQueryName(splittedQuery)}
						</Select.Option>
					))}
				</Select>
			);
		}
		return (
			<Button
				disabled={disabled}
				shape="round"
				onClick={(): void => onCreateAlertsHandler(query)}
				icon={<ConciergeBell size={16} />}
			>
				Create an Alert
			</Button>
		);
	}, [
		disabled,
		isOneChartPerQuery,
		onCreateAlertsHandler,
		query,
		splitedQueries,
	]);

	const AddToDashboardButton = useMemo(() => {
		if (isOneChartPerQuery) {
			const selectLabel = (
				<Button
					type="primary"
					disabled={disabled}
					shape="round"
					onClick={onAddToDashboard}
					icon={<Plus size={16} />}
				>
					Add to Dashboard
				</Button>
			);
			return (
				<Select
					disabled={disabled}
					className="multi-dashboard-button"
					placeholder={selectLabel}
					value={selectLabel}
					suffixIcon={null}
					onSelect={(e): void => {
						const selectedQuery = splitedQueries.find(
							(query) => query.id === ((e as unknown) as string),
						);
						if (selectedQuery) {
							setQueryToExport(() => {
								onAddToDashboard();
								return selectedQuery;
							});
						}
					}}
				>
					{/* eslint-disable-next-line sonarjs/no-identical-functions */}
					{splitedQueries.map((splittedQuery) => (
						<Select.Option key={splittedQuery.id} value={splittedQuery.id}>
							{getQueryName(splittedQuery)}
						</Select.Option>
					))}
				</Select>
			);
		}
		return (
			<Button
				type="primary"
				disabled={disabled}
				shape="round"
				onClick={onAddToDashboard}
				icon={<Plus size={16} />}
			>
				Add to Dashboard
			</Button>
		);
	}, [disabled, isOneChartPerQuery, onAddToDashboard, splitedQueries]);

	const hideToolbar = (): void => {
		setExplorerToolBarVisibility(false, sourcepage);
		if (setIsExplorerOptionHidden) {
			setIsExplorerOptionHidden(true);
		}
	};

	return (
		<div className="explorer-options-container">
			{
				// if a viewName is selected and the explorer options are not hidden then
				// always show the clear option
			}
			{!isExplorerOptionHidden && viewName && (
				<div
					className={cx(
						isEditDeleteSupported ? '' : 'hide-update',
						'explorer-update',
					)}
				>
					<Tooltip title="Clear this view" placement="top">
						<Button
							className="action-icon"
							onClick={handleClearSelect}
							icon={<X size={14} />}
						/>
					</Tooltip>
					{
						// only show the update view option when the query is updated
					}
					{isQueryUpdated && (
						<>
							<Divider
								type="vertical"
								className={isEditDeleteSupported ? '' : 'hidden'}
							/>
							<Tooltip title="Update this view" placement="top">
								<Button
									className={cx('action-icon', isEditDeleteSupported ? ' ' : 'hidden')}
									disabled={isViewUpdating}
									onClick={onUpdateQueryHandler}
									icon={<Disc3 size={14} />}
								/>
							</Tooltip>
						</>
					)}
				</div>
			)}
			{!isExplorerOptionHidden && (
				<div
					className="explorer-options"
					style={{
						background: extraData
							? `linear-gradient(90deg, rgba(0,0,0,0) -5%, ${rgbaColor} 9%, rgba(0,0,0,0) 30%)`
							: 'initial',
					}}
				>
					<div className="view-options">
						<Select<string, { key: string; value: string }>
							showSearch
							placeholder="Select a view"
							loading={viewsIsLoading || isRefetching}
							value={viewName || undefined}
							onSelect={handleSelect}
							style={{
								minWidth: 170,
							}}
							dropdownStyle={dropdownStyle}
							className="views-dropdown"
							allowClear={false}
							ref={ref}
						>
							{viewsData?.data?.data?.map((view) => {
								const extraData =
									view.extraData !== '' ? JSON.parse(view.extraData) : '';
								let bgColor = getRandomColor();
								if (extraData !== '') {
									bgColor = extraData.color;
								}
								return (
									<Select.Option key={view.id} value={view.name}>
										<div className="render-options">
											<span
												className="dot"
												style={{
													background: bgColor,
													boxShadow: `0px 0px 6px 0px ${bgColor}`,
												}}
											/>{' '}
											{view.name}
										</div>
									</Select.Option>
								);
							})}
						</Select>

						<Button
							shape="round"
							onClick={handleSaveViewModalToggle}
							className={isEditDeleteSupported ? '' : 'hidden'}
							disabled={viewsIsLoading || isRefetching}
							icon={<Disc3 size={16} />}
						>
							Save this view
						</Button>
					</div>

					<hr className={isEditDeleteSupported ? '' : 'hidden'} />

					{signalSource !== 'meter' && (
						<div className={cx('actions', isEditDeleteSupported ? '' : 'hidden')}>
							{CreateAlertButton}
							{AddToDashboardButton}
						</div>
					)}

					<div className="actions">
						{/* Hide the info icon for metrics explorer until we get the docs link */}
						{!isMetricsExplorer && (
							<Tooltip
								title={
									<div>
										{infoIconText}
										<Typography.Link href={infoIconLink} target="_blank">
											{' '}
											here
										</Typography.Link>{' '}
									</div>
								}
							>
								<InfoCircleOutlined className="info-icon" />
							</Tooltip>
						)}
						<Tooltip title="Hide">
							<Button
								disabled={disabled}
								shape="circle"
								onClick={hideToolbar}
								icon={<PanelBottomClose size={16} />}
								data-testid="hide-toolbar"
							/>
						</Tooltip>
					</div>
				</div>
			)}
			<ExplorerOptionsHideArea
				viewName={viewName}
				isExplorerOptionHidden={isExplorerOptionHidden}
				setIsExplorerOptionHidden={setIsExplorerOptionHidden}
				sourcepage={sourcepage}
				isQueryUpdated={isQueryUpdated}
				handleClearSelect={handleClearSelect}
				onUpdateQueryHandler={onUpdateQueryHandler}
				isEditDeleteSupported={isEditDeleteSupported}
			/>
			<Modal
				className="save-view-modal"
				title={<span className="title">Save this view</span>}
				open={isSaveModalOpen}
				closable
				onCancel={hideSaveViewModal}
				footer={[
					<Button
						key="submit"
						type="primary"
						icon={<Check size={16} />}
						onClick={onSaveHandler}
						disabled={isSaveViewLoading}
						data-testid="save-view-btn"
					>
						Save this view
					</Button>,
				]}
			>
				<Typography.Text>Label</Typography.Text>
				<div className="save-view-input">
					<ColorPicker
						value={color}
						onChange={(value, hex): void => setColor(hex)}
					/>
					<Input
						placeholder="e.g. External http method view"
						value={newViewName}
						onChange={(e): void => setNewViewName(e.target.value)}
					/>
				</div>
			</Modal>
			<Modal
				footer={null}
				onOk={onCancel(false)}
				onCancel={onCancel(false)}
				open={isExport}
				centered
				destroyOnClose
			>
				<ExportPanelContainer
					query={isOneChartPerQuery ? queryToExport : query}
					isLoading={isLoading}
					onExport={(dashboard, isNewDashboard): void => {
						if (isOneChartPerQuery && queryToExport) {
							onExport(dashboard, isNewDashboard, queryToExport);
						} else {
							onExport(dashboard, isNewDashboard);
						}
					}}
				/>
			</Modal>
		</div>
	);
}

export interface ExplorerOptionsProps {
	isLoading?: boolean;
	onExport: (
		dashboard: Dashboard | null,
		isNewDashboard?: boolean,
		queryToExport?: Query,
	) => void;
	query: Query | null;
	disabled: boolean;
	sourcepage: DataSource;
	signalSource?: string;
	isExplorerOptionHidden?: boolean;
	setIsExplorerOptionHidden?: Dispatch<SetStateAction<boolean>>;
	isOneChartPerQuery?: boolean;
	splitedQueries?: Query[];
	handleChangeSelectedView?: ChangeViewFunctionType;
}

ExplorerOptions.defaultProps = {
	isLoading: false,
	isExplorerOptionHidden: false,
	setIsExplorerOptionHidden: undefined,
	isOneChartPerQuery: false,
	splitedQueries: [],
	signalSource: '',
	handleChangeSelectedView: undefined,
};

export default ExplorerOptions;
