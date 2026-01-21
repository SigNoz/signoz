import { useMemo, useState } from 'react';
import {
	FilterOutlined,
	SyncOutlined,
	VerticalAlignTopOutlined,
} from '@ant-design/icons';
import {
	Combobox,
	ComboboxCommand,
	ComboboxContent,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
} from '@signozhq/combobox';
import { Skeleton, Switch, Tooltip, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import classNames from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useApiMonitoringParams } from 'container/ApiMonitoring/queryParams';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isFunction, isNull } from 'lodash-es';
import { Frown, Settings2 as SettingsIcon } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { USER_ROLES } from 'types/roles';

import Checkbox from './FilterRenderers/Checkbox/Checkbox';
import Duration from './FilterRenderers/Duration/Duration';
import Slider from './FilterRenderers/Slider/Slider';
import useFilterConfig from './hooks/useFilterConfig';
import AnnouncementTooltip from './QuickFiltersSettings/AnnouncementTooltip';
import QuickFiltersSettings from './QuickFiltersSettings/QuickFiltersSettings';
import { FiltersType, IQuickFiltersProps, QuickFiltersSource } from './types';

import './QuickFilters.styles.scss';

export default function QuickFilters(props: IQuickFiltersProps): JSX.Element {
	const {
		className,
		config,
		handleFilterVisibilityChange,
		source,
		onFilterChange,
		signal,
		showFilterCollapse = true,
		showQueryName = true,
	} = props;
	const { user } = useAppContext();
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const isAdmin = user.role === USER_ROLES.ADMIN;
	const [params, setParams] = useApiMonitoringParams();
	const showIP = params.showIP ?? true;

	const {
		filterConfig,
		isDynamicFilters,
		customFilters,
		refetchCustomFilters,
		isCustomFiltersLoading,
	} = useFilterConfig({ signal, config });

	const {
		currentQuery,
		lastUsedQuery,
		setLastUsedQuery,
		redirectWithQueryBuilderData,
		panelType,
	} = useQueryBuilder();
	const [open, setOpen] = useState(false);

	// Sync lastUsedQuery when queries change (e.g., after deletion)
	const validQueryIndex = useMemo(
		() =>
			Math.min(
				lastUsedQuery || 0,
				(currentQuery?.builder?.queryData?.length || 1) - 1,
			),
		[lastUsedQuery, currentQuery?.builder?.queryData?.length],
	);

	// Determine if we're in ListView mode
	const isListView = panelType === PANEL_TYPES.LIST;

	// Generate query options based on available queries
	const queryOptions = useMemo(() => {
		if (!currentQuery?.builder?.queryData) {
			return [];
		}

		return currentQuery.builder.queryData.map((query, index) => ({
			label: query.queryName || String.fromCharCode(65 + index),
			value: index,
		}));
	}, [currentQuery?.builder?.queryData]);

	// Show dropdown in ListView only for TRACES_EXPLORER source
	const shouldShowDropdownInListView =
		isListView && source === QuickFiltersSource.TRACES_EXPLORER;

	const showAnnouncementTooltip = useMemo(() => {
		const localStorageValue = getLocalStorageKey(
			LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT,
		);
		if (!isNull(localStorageValue)) {
			return !(localStorageValue === 'false');
		}
		return true;
	}, []);

	const activeQueryIndex = useMemo(() => {
		if (isListView) {
			return source === QuickFiltersSource.TRACES_EXPLORER
				? lastUsedQuery || 0
				: 0;
		}
		return lastUsedQuery || 0;
	}, [isListView, source, lastUsedQuery]);

	// clear all the filters for the query which is in sync with filters
	const handleReset = (): void => {
		const activeQuery = currentQuery?.builder.queryData?.[activeQueryIndex];

		if (!activeQuery) {
			return;
		}

		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item, idx) => {
					if (idx !== activeQueryIndex) {
						return item;
					}

					return {
						...item,
						filter: {
							...item.filter,
							expression: '',
						},
						filters: {
							...item.filters,
							items: [],
							op: item.filters?.op || 'AND',
						},
					};
				}),
			},
		};

		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(preparedQuery);
		} else {
			redirectWithQueryBuilderData(preparedQuery);
		}
	};

	const lastQueryName =
		showQueryName &&
		currentQuery.builder.queryData?.[lastUsedQuery || 0]?.queryName;

	// In ListView, always show the 0th query's name; otherwise use the active query's name
	const displayedQueryName = isListView
		? showQueryName && currentQuery.builder.queryData?.[0]?.queryName
		: lastQueryName;

	const handleQueryChange = (value: number): void => {
		setLastUsedQuery(value);
	};

	// Helpers to reduce cognitive complexity in main render
	const renderLeftActions = (): JSX.Element => (
		<section className="left-actions">
			<FilterOutlined />
			<Typography.Text className="text">
				{displayedQueryName ? 'Filters for' : 'Filters'}
			</Typography.Text>
			{queryOptions.length > 1 && (!isListView || shouldShowDropdownInListView) ? (
				<Combobox open={open} onOpenChange={setOpen}>
					<ComboboxTrigger
						placeholder="Select a query"
						value={queryOptions.find((f) => f.value === validQueryIndex)?.label || ''}
						className="select-box"
					/>
					{open && (
						<ComboboxContent>
							<ComboboxCommand>
								<ComboboxList>
									{queryOptions.map((option) => (
										<ComboboxItem
											key={option.value}
											value={String(option.value)}
											onSelect={(): void => {
												handleQueryChange(option.value);
												setOpen(false);
											}}
											isSelected={validQueryIndex === option.value}
											showCheck={false}
										>
											{option.label}
										</ComboboxItem>
									))}
								</ComboboxList>
							</ComboboxCommand>
						</ComboboxContent>
					)}
				</Combobox>
			) : (
				displayedQueryName && (
					<Tooltip
						title={`Filter currently in sync with query ${displayedQueryName}`}
					>
						<Typography.Text className="sync-tag">
							{displayedQueryName}
						</Typography.Text>
					</Tooltip>
				)
			)}
		</section>
	);

	const renderRightActions = (): JSX.Element => (
		<section className="right-actions">
			<Tooltip title="Reset All">
				<div className="right-action-icon-container">
					<SyncOutlined className="sync-icon" onClick={handleReset} />
				</div>
			</Tooltip>
			{showFilterCollapse && (
				<Tooltip title="Collapse Filters">
					<div className="right-action-icon-container">
						<VerticalAlignTopOutlined
							rotate={270}
							onClick={handleFilterVisibilityChange}
						/>
					</div>
				</Tooltip>
			)}
			{isDynamicFilters && isAdmin && (
				<Tooltip title="Settings">
					<div
						className={classNames('right-action-icon-container', {
							active: isSettingsOpen,
						})}
					>
						<SettingsIcon
							className="settings-icon"
							data-testid="settings-icon"
							width={14}
							height={14}
							onClick={(): void => setIsSettingsOpen(true)}
						/>
						<AnnouncementTooltip
							show={showAnnouncementTooltip}
							position={{ top: -5, left: 15 }}
							title="Edit your quick filters"
							message="You can now customize and re-arrange your quick filters panel. Select the quick filters you’d need and hide away the rest for faster exploration."
							onClose={(): void => {
								setLocalStorageKey(
									LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT,
									'false',
								);
							}}
						/>
					</div>
				</Tooltip>
			)}
		</section>
	);

	const renderContent = (): JSX.Element => (
		<>
			{source === QuickFiltersSource.API_MONITORING && (
				<div className="api-quick-filters-header">
					<Typography.Text>Show IP addresses</Typography.Text>
					<Switch
						size="small"
						style={{ marginLeft: 'auto' }}
						checked={showIP ?? true}
						onClick={(): void => {
							logEvent('API Monitoring: Show IP addresses clicked', {
								showIP: !(showIP ?? true),
							});
							setParams({ showIP });
						}}
					/>
				</div>
			)}
			<section className="filters">
				{filterConfig.map((filter) => {
					switch (filter.type) {
						case FiltersType.CHECKBOX:
							return (
								<Checkbox
									source={source}
									filter={filter}
									onFilterChange={onFilterChange}
								/>
							);
						case FiltersType.DURATION:
							return <Duration filter={filter} onFilterChange={onFilterChange} />;
						case FiltersType.SLIDER:
							return <Slider />;
						// eslint-disable-next-line sonarjs/no-duplicated-branches
						default:
							return (
								<Checkbox
									source={source}
									filter={filter}
									onFilterChange={onFilterChange}
								/>
							);
					}
				})}

				{filterConfig.length === 0 && (
					<div className="no-filters-container">
						<Frown size={16} />
						<Typography.Text>No filters found</Typography.Text>
					</div>
				)}
			</section>
		</>
	);

	return (
		<div className="quick-filters-container">
			<div className="quick-filters">
				{source !== QuickFiltersSource.INFRA_MONITORING && (
					<section className="header">
						{renderLeftActions()}
						{renderRightActions()}
					</section>
				)}

				{isCustomFiltersLoading ? (
					<div className="quick-filters-skeleton">
						{Array.from({ length: 5 }).map((_, index) => (
							// eslint-disable-next-line react/no-array-index-key
							<Skeleton.Input active size="small" key={index} />
						))}
					</div>
				) : (
					<OverlayScrollbar>{renderContent()}</OverlayScrollbar>
				)}
			</div>
			<div className="quick-filters-settings-container">
				<div
					className={classNames(
						'quick-filters-settings',
						{
							hidden: !isSettingsOpen,
						},
						className,
					)}
				>
					{isSettingsOpen && (
						<QuickFiltersSettings
							signal={signal}
							setIsSettingsOpen={setIsSettingsOpen}
							customFilters={customFilters}
							refetchCustomFilters={refetchCustomFilters}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

QuickFilters.defaultProps = {
	onFilterChange: null,
	signal: '',
	config: [],
	showFilterCollapse: true,
	showQueryName: true,
};
