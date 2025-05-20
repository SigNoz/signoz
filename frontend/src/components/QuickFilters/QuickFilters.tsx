import './QuickFilters.styles.scss';

import {
	FilterOutlined,
	SyncOutlined,
	VerticalAlignTopOutlined,
} from '@ant-design/icons';
import { Skeleton, Tooltip, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import classNames from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep, isFunction, isNull } from 'lodash-es';
import { Settings2 as SettingsIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import Checkbox from './FilterRenderers/Checkbox/Checkbox';
import Slider from './FilterRenderers/Slider/Slider';
import useFilterConfig from './hooks/useFilterConfig';
import AnnouncementTooltip from './QuickFiltersSettings/AnnouncementTooltip';
import QuickFiltersSettings from './QuickFiltersSettings/QuickFiltersSettings';
import { FiltersType, IQuickFiltersProps, QuickFiltersSource } from './types';

export default function QuickFilters(props: IQuickFiltersProps): JSX.Element {
	const {
		className,
		config,
		handleFilterVisibilityChange,
		source,
		onFilterChange,
		signal,
	} = props;
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);

	const {
		filterConfig,
		isDynamicFilters,
		customFilters,
		setIsStale,
		isCustomFiltersLoading,
	} = useFilterConfig({ signal, config });

	const {
		currentQuery,
		lastUsedQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	const showAnnouncementTooltip = useMemo(() => {
		const localStorageValue = getLocalStorageKey(
			LOCALSTORAGE.QUICK_FILTERS_SETTINGS_ANNOUNCEMENT,
		);
		if (!isNull(localStorageValue)) {
			return !(localStorageValue === 'false');
		}
		return true;
	}, []);

	// clear all the filters for the query which is in sync with filters
	const handleReset = (): void => {
		const updatedQuery = cloneDeep(
			currentQuery?.builder.queryData?.[lastUsedQuery || 0],
		);

		if (!updatedQuery) {
			return;
		}

		if (updatedQuery?.filters?.items) {
			updatedQuery.filters.items = [];
		}

		const preparedQuery: Query = {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: currentQuery.builder.queryData.map((item, idx) => ({
					...item,
					filters: {
						...item.filters,
						items: idx === lastUsedQuery ? [] : [...item.filters.items],
					},
				})),
			},
		};

		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(preparedQuery);
		} else {
			redirectWithQueryBuilderData(preparedQuery);
		}
	};

	const lastQueryName =
		currentQuery.builder.queryData?.[lastUsedQuery || 0]?.queryName;

	return (
		<div className="quick-filters-container">
			<div className="quick-filters">
				{source !== QuickFiltersSource.INFRA_MONITORING &&
					source !== QuickFiltersSource.API_MONITORING && (
						<section className="header">
							<section className="left-actions">
								<FilterOutlined />
								<Typography.Text className="text">
									{lastQueryName ? 'Filters for' : 'Filters'}
								</Typography.Text>
								{lastQueryName && (
									<Tooltip
										title={`Filter currently in sync with query ${lastQueryName}`}
									>
										<Typography.Text className="sync-tag">
											{lastQueryName}
										</Typography.Text>
									</Tooltip>
								)}
							</section>

							<section className="right-actions">
								<Tooltip title="Reset All">
									<div className="right-action-icon-container">
										<SyncOutlined className="sync-icon" onClick={handleReset} />
									</div>
								</Tooltip>
								<Tooltip title="Collapse Filters">
									<div className="right-action-icon-container">
										<VerticalAlignTopOutlined
											rotate={270}
											onClick={handleFilterVisibilityChange}
										/>
									</div>
								</Tooltip>
								{isDynamicFilters && (
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
						</section>
					)}

				{isCustomFiltersLoading ? (
					<div className="quick-filters-skeleton">
						{Array.from({ length: 5 }).map((_, index) => (
							<Skeleton.Input
								active
								size="small"
								// eslint-disable-next-line react/no-array-index-key
								key={index}
							/>
						))}
					</div>
				) : (
					<OverlayScrollbar>
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
									case FiltersType.SLIDER:
										return <Slider filter={filter} />;
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
						</section>
					</OverlayScrollbar>
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
							setIsStale={setIsStale}
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
};
