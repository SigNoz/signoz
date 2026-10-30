import { useCallback, useMemo } from 'react';
import ErrorEmptyState from 'components/Alerts/ErrorEmptyState';
import NoResultsEmptyState from 'components/Alerts/NoResultsEmptyState';
import ListCommandHeader from 'components/ListViews/ListCommandHeader/ListCommandHeader';
import ListStatusBar from 'components/ListViews/ListStatusBar/ListStatusBar';
import ViewsRail from 'components/ListViews/ViewsRail/ViewsRail';
import TanStackTable from 'components/TanStackTableView';
import { useCalculatedPageSize } from 'components/TanStackTableView/useCalculatedPageSize';
import { useTableParams } from 'components/TanStackTableView/useTableParams';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';
import { useTimezone } from 'providers/Timezone';

import { AlertsEmptyState } from './AlertsEmptyState/AlertsEmptyState';
import { ActionsMenu } from './components';
import AlertRulesFilterZone from './components/AlertRulesFilterZone';
import AlertRulesHeaderActions from './components/AlertRulesHeaderActions';
import styles from './ListAlertRules.module.scss';
import { getAlertRuleColumns } from './table.config';
import type { AlertRule } from './types';
import { useAlertRulesStripInfo } from './useAlertRulesStripInfo';
import { useAlertRulesData } from './useAlertRulesData';
import { useAlertRulesFilterSource } from './useAlertRulesFilterSource';
import { useAlertRulesHandlers } from './useAlertRulesHandlers';
import { useAlertRulesListFilter } from './useAlertRulesListFilter';
import { useAlertRuleViews } from './useAlertRuleViews';
import { useAlertRuleViewsStore } from './useAlertRuleViewsStore';
import { RULE_BUILTIN_VIEWS, RuleBuiltinViewId } from './views';

const QUERY_PARAMS_CONFIG = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

function ListAlertRules(): JSX.Element {
	const { user } = useAppContext();
	const [addNewAlert, action] = useComponentPermission(
		['add_new_alert', 'action'],
		user.role,
	);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const { containerRef, calculatedPageSize } = useCalculatedPageSize({
		rowHeight: 46,
	});

	const { orderBy, page, limit, setLimit, setPage, setOrderBy } = useTableParams(
		QUERY_PARAMS_CONFIG,
		{
			page: DEFAULT_PAGE,
			limit: DEFAULT_LIMIT,
			storageKey: 'alert-rules',
			calculatedPageSize,
			cleanupOnUnmount: true,
		},
	);

	const { filter, applyFilter, submitQuery, changeStates } =
		useAlertRulesListFilter({ orderBy, setOrderBy, setPage });

	const ruleViews = useAlertRuleViews({
		filter,
		applyFilter,
		userEmail: user.email,
	});

	const railCollapsed = useAlertRuleViewsStore((s) => s.railCollapsed);
	const setRailCollapsed = useAlertRuleViewsStore((s) => s.setRailCollapsed);
	const toggleRail = useCallback((): void => {
		setRailCollapsed(!railCollapsed);
	}, [setRailCollapsed, railCollapsed]);

	const listParams = useMemo(
		() => ({
			query: filter.query || undefined,
			states: filter.states.length ? filter.states : undefined,
			sort: filter.sort,
			order: filter.order,
			limit,
			offset: (page - 1) * limit,
		}),
		[filter, limit, page],
	);

	const {
		rules,
		total,
		labels,
		reservedKeywords,
		isFetching,
		isError,
		queryError,
		refetch,
	} = useAlertRulesData(listParams);

	const { creatorOptions, source } = useAlertRulesFilterSource({
		rules,
		labels,
		reservedKeywords,
		userEmail: user.email,
	});

	const { handleEdit, handleNewAlert, handleRowClick, handleRowClickNewTab } =
		useAlertRulesHandlers(total);

	const { selectView } = ruleViews;
	const handleClearFilters = useCallback((): void => {
		selectView(RuleBuiltinViewId.All);
	}, [selectView]);

	const columns = useMemo(
		() => getAlertRuleColumns(formatTimezoneAdjustedTimestamp),
		[formatTimezoneAdjustedTimestamp],
	);

	useAlertRulesStripInfo({
		shownCount: rules.length,
		totalCount: total,
	});

	const columnsWithActions = useMemo(() => {
		if (!action) {
			return columns;
		}

		return [
			...columns,
			{
				id: 'actions',
				header: (): JSX.Element => (
					<span style={{ textAlign: 'right', display: 'block' }}>Actions</span>
				),
				accessorKey: 'id',
				width: { fixed: '80px', ignoreLastColumnFill: true },
				enableSort: false,
				enableRemove: false,
				enableMove: false,
				pin: 'right' as const,
				cell: ({ row }: { row: AlertRule }): JSX.Element => (
					<div className={styles.actionsColumn}>
						<ActionsMenu rule={row} onEdit={handleEdit} />
					</div>
				),
			},
		];
	}, [action, columns, handleEdit]);

	const hasActiveFilters = filter.query.length > 0 || filter.states.length > 0;
	const isEmptyDueToFilters =
		!isFetching && total === 0 && (hasActiveFilters || !!queryError);
	const isEmptyNoRules =
		!isFetching && !isError && !queryError && !hasActiveFilters && total === 0;

	const activeLabel =
		ruleViews.activeView?.name ??
		RULE_BUILTIN_VIEWS.find((v) => v.id === ruleViews.activeViewId)?.label ??
		'Alert rules';

	return (
		<div className={styles.layout}>
			<ViewsRail
				activeViewId={ruleViews.activeViewId}
				builtinViews={RULE_BUILTIN_VIEWS}
				customViews={ruleViews.customViews}
				customViewsLoading={ruleViews.customViewsLoading}
				isCustomActive={ruleViews.isCustomActive}
				isModified={ruleViews.isModified}
				collapsed={railCollapsed}
				onSelect={ruleViews.selectView}
				onSave={ruleViews.saveView}
				onSaveChanges={ruleViews.saveActiveView}
				onReset={ruleViews.resetView}
				onDelete={ruleViews.removeView}
				onRename={ruleViews.renameView}
				testIdPrefix="alert-rules"
				saveTestIdPrefix="save-alert-rule-view"
				renameTestIdPrefix="rename-alert-rule-view"
				deleteDescription="Views are shared across your organization, so this removes it for everyone. Alert rules are not affected."
			/>
			<div className={styles.main}>
				{!isEmptyNoRules && (
					<div className={styles.headerZone}>
						<ListCommandHeader
							label={activeLabel}
							count={total}
							isModified={ruleViews.isModified}
							action={
								<AlertRulesHeaderActions
									columns={columns}
									canAddAlert={addNewAlert}
									onNewAlert={handleNewAlert}
								/>
							}
						/>
						<AlertRulesFilterZone
							query={filter.query}
							states={filter.states}
							creatorOptions={creatorOptions}
							source={source}
							error={queryError}
							onQueryChange={submitQuery}
							onStatesChange={changeStates}
						/>
					</div>
				)}

				<div ref={containerRef} className={styles.tableContainer}>
					{isError ? (
						<ErrorEmptyState title="Failed to load alert rules" onRefresh={refetch} />
					) : isEmptyDueToFilters ? (
						<NoResultsEmptyState
							title="No matching alert rules"
							subtitle={
								queryError
									? 'The filter query is invalid. Fix it or clear the search.'
									: 'No alert rules match your search. Try adjusting your search criteria.'
							}
							onClear={handleClearFilters}
							clearButtonText="Clear Search"
						/>
					) : isEmptyNoRules ? (
						<AlertsEmptyState onRefresh={refetch} />
					) : (
						<TanStackTable<AlertRule>
							data={rules}
							columns={columnsWithActions}
							isLoading={isFetching}
							getRowKey={(row): string => row.id ?? ''}
							getItemKey={(row): string => row.id ?? ''}
							columnStorageKey="alert-rules-columns"
							enableQueryParams={QUERY_PARAMS_CONFIG}
							onRowClick={handleRowClick}
							onRowClickNewTab={handleRowClickNewTab}
							pagination={{
								total,
								calculatedPageSize,
								onLimitChange: setLimit,
								showTotalCount: true,
							}}
							paginationClassname={styles.paginationContainer}
							enableAlternatingRowColors
							plainTextCellLineClamp={2}
						/>
					)}
				</div>
				<ListStatusBar
					collapsed={railCollapsed}
					onToggleCollapse={toggleRail}
					count={rules.length}
					total={total}
					noun="alert rules"
					testId="alert-rules-rail-toggle"
				/>
			</div>
		</div>
	);
}

export default ListAlertRules;
