/* eslint-disable @typescript-eslint/explicit-function-return-type */
import './InfraMonitoringK8s.styles.scss';

import { Button, Select } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { INFRA_MONITORING_K8S_PARAMS_KEYS, K8sCategory } from './constants';
import K8sFiltersSidePanel from './K8sFiltersSidePanel/K8sFiltersSidePanel';
import { IEntityColumn } from './utils';

interface K8sHeaderProps {
	selectedGroupBy: BaseAutocompleteData[];
	groupByOptions: { value: string; label: string }[];
	isLoadingGroupByFilters: boolean;
	handleFiltersChange: (value: IBuilderQuery['filters']) => void;
	handleGroupByChange: (value: IBuilderQuery['groupBy']) => void;
	defaultAddedColumns: IEntityColumn[];
	addedColumns?: IEntityColumn[];
	availableColumns?: IEntityColumn[];
	onAddColumn?: (column: IEntityColumn) => void;
	onRemoveColumn?: (column: IEntityColumn) => void;
	handleFilterVisibilityChange: () => void;
	isFiltersVisible: boolean;
	entity: K8sCategory;
	showAutoRefresh: boolean;
}

function K8sHeader({
	selectedGroupBy,
	defaultAddedColumns,
	groupByOptions,
	isLoadingGroupByFilters,
	addedColumns,
	availableColumns,
	handleFiltersChange,
	handleGroupByChange,
	onAddColumn,
	onRemoveColumn,
	handleFilterVisibilityChange,
	isFiltersVisible,
	entity,
	showAutoRefresh,
}: K8sHeaderProps): JSX.Element {
	const [isFiltersSidePanelOpen, setIsFiltersSidePanelOpen] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();

	const currentQuery = initialQueriesMap[DataSource.METRICS];

	const updatedCurrentQuery = useMemo(() => {
		const urlFilters = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS);
		let { filters } = currentQuery.builder.queryData[0];
		if (urlFilters) {
			const decoded = decodeURIComponent(urlFilters);
			const parsed = JSON.parse(decoded);
			filters = parsed;
		}
		return {
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
						filters,
					},
				],
			},
		};
	}, [currentQuery, searchParams]);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			handleFiltersChange(value);
			setSearchParams({
				...Object.fromEntries(searchParams.entries()),
				[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: JSON.stringify(value),
			});
		},
		[handleFiltersChange, searchParams, setSearchParams],
	);

	return (
		<div className="k8s-list-controls">
			<div className="k8s-list-controls-left">
				{!isFiltersVisible && (
					<div className="quick-filters-toggle-container">
						<Button
							className="periscope-btn ghost"
							type="text"
							size="small"
							onClick={handleFilterVisibilityChange}
						>
							<Filter size={14} />
						</Button>
					</div>
				)}

				<div className="k8s-qb-search-container">
					<QueryBuilderSearch
						query={query as IBuilderQuery}
						onChange={handleChangeTagFilters}
						isInfraMonitoring
						disableNavigationShortcuts
						entity={entity}
					/>
				</div>

				<div className="k8s-attribute-search-container">
					<div className="group-by-label"> Group by </div>
					<Select
						className="group-by-select"
						loading={isLoadingGroupByFilters}
						mode="multiple"
						value={selectedGroupBy}
						allowClear
						maxTagCount="responsive"
						placeholder="Search for attribute"
						style={{ width: '100%' }}
						options={groupByOptions}
						onChange={handleGroupByChange}
					/>
				</div>
			</div>

			<div className="k8s-list-controls-right">
				<DateTimeSelectionV2
					showAutoRefresh={showAutoRefresh}
					showRefreshText={false}
					hideShareModal
				/>

				<Button
					type="text"
					className="periscope-btn ghost"
					disabled={selectedGroupBy?.length > 0}
					onClick={(): void => setIsFiltersSidePanelOpen(true)}
				>
					<SlidersHorizontal size={14} />
				</Button>
			</div>

			{isFiltersSidePanelOpen && (
				<K8sFiltersSidePanel
					defaultAddedColumns={defaultAddedColumns}
					addedColumns={addedColumns}
					availableColumns={availableColumns}
					onClose={(): void => {
						if (isFiltersSidePanelOpen) {
							setIsFiltersSidePanelOpen(false);
						}
					}}
					onAddColumn={onAddColumn}
					onRemoveColumn={onRemoveColumn}
				/>
			)}
		</div>
	);
}

K8sHeader.defaultProps = {
	addedColumns: [],
	availableColumns: [],
	onAddColumn: () => {},
	onRemoveColumn: () => {},
};

export default K8sHeader;
