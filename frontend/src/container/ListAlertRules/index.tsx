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
import {
	DEFAULT_RULE_VIEW,
	findRuleBuiltinView,
	RULE_BUILTIN_VIEWS,
} from './list.config';
import { useRuleViewCtx } from './useRuleViewCtx';
import { ruleListEmptyState } from './utils';

const QUERY_PARAMS_CONFIG = {
	orderBy: 'orderBy',
	page: 'page',
	limit: 'limit',
} as const;

// Client-filtered views (Recently viewed) narrow one page of the API's max size.
const CLIENT_VIEW_LIMIT = 200;

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

	const { filter, applyFilter, submitQuery, changeStates, changeSort } =
		useAlertRulesListFilter({ orderBy, setOrderBy, setPage });

	const ruleViews = useAlertRuleViews({ filter, applyFilter });

	const railCollapsed = useAlertRuleViewsStore((s) => s.railCollapsed);
	const setRailCollapsed = useAlertRuleViewsStore((s) => s.setRailCollapsed);
	const toggleRail = useCallback((): void => {
		setRailCollapsed(!railCollapsed);
	}, [setRailCollapsed, railCollapsed]);

	const viewCtx = useRuleViewCtx();
	const clientFilter = findRuleBuiltinView(ruleViews.activeViewId)?.clientFilter;
	const clientView = !!clientFilter;

	const listParams = useMemo(
		() => ({
			query: filter.query || undefined,
			states: filter.states.length ? filter.states : undefined,
			sort: filter.sort,
			order: filter.order,
			limit: clientView ? CLIENT_VIEW_LIMIT : limit,
			offset: clientView ? 0 : (page - 1) * limit,
		}),
		[filter, limit, page, clientView],
	);

	const {
		rules: fetchedRules,
		total: fetchedTotal,
		labels,
		reservedKeywords,
		isFetching,
		isError,
		queryError,
		refetch,
	} = useAlertRulesData(listParams);

	const clientRules = useMemo(
		() => (clientFilter ? clientFilter(fetchedRules, viewCtx) : null),
		[clientFilter, fetchedRules, viewCtx],
	);
	const rules = useMemo(
		() =>
			clientRules
				? clientRules.slice((page - 1) * limit, page * limit)
				: fetchedRules,
		[clientRules, fetchedRules, page, limit],
	);
	const total = clientRules ? clientRules.length : fetchedTotal;

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
		selectView(DEFAULT_RULE_VIEW);
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
	const { isEmptyDueToFilters, isEmptyNoRules, noResults, canClear } =
		ruleListEmptyState({
			isFetching,
			isError,
			queryError,
			hasActiveFilters,
			total,
			viewEmptyState: findRuleBuiltinView(ruleViews.activeViewId)?.emptyState,
		});

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
							testIdPrefix="alert-rules"
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
							title={noResults.title}
							subtitle={noResults.description}
							onClear={canClear ? handleClearFilters : undefined}
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
							onSort={changeSort}
							onRowClick={handleRowClick}
							onRowClickNewTab={handleRowClickNewTab}
							pagination={{
								total,
								calculatedPageSize,
								onLimitChange: setLimit,
								showTotalCount: true,
							}}
							paginationClassname={styles.paginationContainer}
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
